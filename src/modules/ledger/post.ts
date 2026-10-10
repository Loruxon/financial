import { Decimal } from "decimal.js";
import { createId, getStore } from "@/mocks/store";
import type { Money } from "@/modules/shared/types";
import type {
  LedgerAccount,
  LedgerAccountType,
  LedgerTransaction,
  LedgerTransactionType,
} from "./types";

type AccountScope = {
  organizationId?: string;
  internalAccountId?: string;
};

type PostEntryInput = AccountScope & {
  accountType: LedgerAccountType;
  amountRub: Money;
};

type PostTransactionInput = {
  transactionType: LedgerTransactionType;
  entries: PostEntryInput[];
  /** Делает проводку идемпотентной: повторный вызов с тем же ключом ничего не меняет. */
  idempotencyKey: string;
  paymentOrderId?: string;
  incomingPaymentId?: string;
  internalTransferId?: string;
  outgoingPaymentId?: string;
  reversesTransactionId?: string;
  createdByUserId?: string | null;
  comment?: string;
  occurredAt?: string;
};

function getOrCreateLedgerAccount(
  accountType: LedgerAccountType,
  scope: AccountScope,
): LedgerAccount {
  const store = getStore();
  const organizationId = scope.organizationId ?? null;
  const internalAccountId = scope.internalAccountId ?? null;
  const existing = store.ledgerAccounts.find(
    (account) =>
      account.accountType === accountType &&
      account.organizationId === organizationId &&
      account.internalAccountId === internalAccountId,
  );
  if (existing) return existing;

  const account: LedgerAccount = {
    id: createId("ledger_account"),
    accountType,
    organizationId,
    internalAccountId,
  };
  store.ledgerAccounts.push(account);
  return account;
}

/**
 * Проводит одну книжную операцию (несколько записей с нулевой суммой).
 * Плюс — дебет, минус — кредит (раздел 5.2 target-design.md).
 */
export function postLedgerTransaction(
  input: PostTransactionInput,
): LedgerTransaction {
  const store = getStore();

  const existing = store.ledgerTransactions.find(
    (t) => t.idempotencyKey === input.idempotencyKey,
  );
  if (existing) return existing;

  const sum = input.entries.reduce(
    (acc, entry) => acc.plus(entry.amountRub),
    new Decimal(0),
  );
  if (!sum.isZero()) {
    throw new Error(
      `Проводка "${input.transactionType}" не сбалансирована: сумма записей = ${sum.toString()}`,
    );
  }

  const transaction: LedgerTransaction = {
    id: createId("ledger_tx"),
    transactionType: input.transactionType,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    paymentOrderId: input.paymentOrderId ?? null,
    incomingPaymentId: input.incomingPaymentId ?? null,
    internalTransferId: input.internalTransferId ?? null,
    outgoingPaymentId: input.outgoingPaymentId ?? null,
    reversesTransactionId: input.reversesTransactionId ?? null,
    idempotencyKey: input.idempotencyKey,
    createdByUserId: input.createdByUserId ?? null,
    comment: input.comment ?? "",
  };
  store.ledgerTransactions.push(transaction);

  for (const entry of input.entries) {
    const account = getOrCreateLedgerAccount(entry.accountType, entry);
    store.ledgerEntries.push({
      id: createId("ledger_entry"),
      ledgerTransactionId: transaction.id,
      ledgerAccountId: account.id,
      amountRub: entry.amountRub,
    });
  }

  return transaction;
}

export function postOpeningBalance(input: {
  internalAccountId: string;
  amountRub: Money;
  createdByUserId?: string | null;
  occurredAt?: string;
}): LedgerTransaction {
  return postLedgerTransaction({
    transactionType: "opening_balance",
    idempotencyKey: `opening_balance:${input.internalAccountId}`,
    createdByUserId: input.createdByUserId,
    occurredAt: input.occurredAt,
    entries: [
      {
        accountType: "internal_account",
        internalAccountId: input.internalAccountId,
        amountRub: input.amountRub,
      },
      {
        accountType: "opening_equity",
        amountRub: new Decimal(input.amountRub).negated().toFixed(2),
      },
    ],
  });
}

export function postIncomingPaymentConfirmed(input: {
  incomingPaymentId: string;
  internalAccountId: string;
  organizationId: string;
  amountRub: Money;
  createdByUserId?: string | null;
  occurredAt?: string;
}): LedgerTransaction {
  return postLedgerTransaction({
    transactionType: "incoming_payment_confirmed",
    idempotencyKey: `incoming_payment_confirmed:${input.incomingPaymentId}`,
    incomingPaymentId: input.incomingPaymentId,
    createdByUserId: input.createdByUserId,
    occurredAt: input.occurredAt,
    entries: [
      {
        accountType: "internal_account",
        internalAccountId: input.internalAccountId,
        amountRub: input.amountRub,
      },
      {
        accountType: "organization_available",
        organizationId: input.organizationId,
        amountRub: new Decimal(input.amountRub).negated().toFixed(2),
      },
    ],
  });
}

export function postPaymentOrderHold(input: {
  paymentOrderId: string;
  organizationId: string;
  amountRub: Money;
  createdByUserId?: string | null;
  occurredAt?: string;
}): LedgerTransaction {
  return postLedgerTransaction({
    transactionType: "payment_order_hold",
    idempotencyKey: `payment_order_hold:${input.paymentOrderId}`,
    paymentOrderId: input.paymentOrderId,
    createdByUserId: input.createdByUserId,
    occurredAt: input.occurredAt,
    entries: [
      {
        accountType: "organization_available",
        organizationId: input.organizationId,
        amountRub: input.amountRub,
      },
      {
        accountType: "organization_held",
        organizationId: input.organizationId,
        amountRub: new Decimal(input.amountRub).negated().toFixed(2),
      },
    ],
  });
}

/**
 * Доводит удержание по заявке от первоначальной суммы фондирования до
 * `clientChargeRub`. Разница возвращается в доступный остаток клиента
 * (или, если клиент должен больше — забирается из него).
 */
export function postPaymentOrderHoldAdjusted(input: {
  paymentOrderId: string;
  organizationId: string;
  heldAmountRub: Money;
  clientChargeRub: Money;
  createdByUserId?: string | null;
  occurredAt?: string;
  /**
   * По умолчанию одна заявка — одна корректировка. Для повторного расчёта
   * (до закрытия заявки) передайте уникальный ключ, иначе повтор не применится.
   */
  idempotencyKey?: string;
}): LedgerTransaction | null {
  const delta = new Decimal(input.heldAmountRub).minus(input.clientChargeRub);
  if (delta.isZero()) return null;

  return postLedgerTransaction({
    transactionType: "payment_order_hold_adjusted",
    idempotencyKey:
      input.idempotencyKey ??
      `payment_order_hold_adjusted:${input.paymentOrderId}`,
    paymentOrderId: input.paymentOrderId,
    createdByUserId: input.createdByUserId,
    occurredAt: input.occurredAt,
    entries: [
      {
        accountType: "organization_held",
        organizationId: input.organizationId,
        amountRub: delta.toFixed(2),
      },
      {
        accountType: "organization_available",
        organizationId: input.organizationId,
        amountRub: delta.negated().toFixed(2),
      },
    ],
  });
}

export function postPaymentOrderClosed(input: {
  paymentOrderId: string;
  organizationId: string;
  clientChargeRub: Money;
  costAmountRub: Money;
  marginRub: Money;
  createdByUserId?: string | null;
  occurredAt?: string;
}): LedgerTransaction {
  return postLedgerTransaction({
    transactionType: "payment_order_closed",
    idempotencyKey: `payment_order_closed:${input.paymentOrderId}`,
    paymentOrderId: input.paymentOrderId,
    createdByUserId: input.createdByUserId,
    occurredAt: input.occurredAt,
    entries: [
      {
        accountType: "organization_held",
        organizationId: input.organizationId,
        amountRub: input.clientChargeRub,
      },
      {
        accountType: "execution_clearing",
        amountRub: new Decimal(input.costAmountRub).negated().toFixed(2),
      },
      {
        accountType: "margin_revenue",
        amountRub: new Decimal(input.marginRub).negated().toFixed(2),
      },
    ],
  });
}

export function postOutgoingPaymentExecuted(input: {
  outgoingPaymentId: string;
  internalAccountId: string;
  amountRub: Money;
  createdByUserId?: string | null;
  occurredAt?: string;
}): LedgerTransaction {
  return postLedgerTransaction({
    transactionType: "outgoing_payment_executed",
    idempotencyKey: `outgoing_payment_executed:${input.outgoingPaymentId}`,
    outgoingPaymentId: input.outgoingPaymentId,
    createdByUserId: input.createdByUserId,
    occurredAt: input.occurredAt,
    entries: [
      {
        accountType: "execution_clearing",
        amountRub: input.amountRub,
      },
      {
        accountType: "internal_account",
        internalAccountId: input.internalAccountId,
        amountRub: new Decimal(input.amountRub).negated().toFixed(2),
      },
    ],
  });
}

export function postInternalTransferExecuted(input: {
  internalTransferId: string;
  fromInternalAccountId: string;
  toInternalAccountId: string;
  amountRub: Money;
  createdByUserId?: string | null;
  occurredAt?: string;
}): LedgerTransaction {
  return postLedgerTransaction({
    transactionType: "internal_transfer_executed",
    idempotencyKey: `internal_transfer_executed:${input.internalTransferId}`,
    internalTransferId: input.internalTransferId,
    createdByUserId: input.createdByUserId,
    occurredAt: input.occurredAt,
    entries: [
      {
        accountType: "internal_account",
        internalAccountId: input.toInternalAccountId,
        amountRub: input.amountRub,
      },
      {
        accountType: "internal_account",
        internalAccountId: input.fromInternalAccountId,
        amountRub: new Decimal(input.amountRub).negated().toFixed(2),
      },
    ],
  });
}

/** Сторнирует проводку: создаёт зеркальную операцию с противоположными знаками. */
export function postReversal(
  originalTransactionId: string,
  options?: { createdByUserId?: string | null; comment?: string },
): LedgerTransaction {
  const store = getStore();
  const original = store.ledgerTransactions.find(
    (t) => t.id === originalTransactionId,
  );
  if (!original) {
    throw new Error(`Проводка ${originalTransactionId} не найдена`);
  }
  const originalEntries = store.ledgerEntries.filter(
    (e) => e.ledgerTransactionId === original.id,
  );

  return postLedgerTransaction({
    transactionType: "reversal",
    idempotencyKey: `reversal:${original.id}`,
    reversesTransactionId: original.id,
    createdByUserId: options?.createdByUserId,
    comment: options?.comment,
    entries: originalEntries.map((entry) => {
      const account = store.ledgerAccounts.find(
        (a) => a.id === entry.ledgerAccountId,
      );
      if (!account) {
        throw new Error(`Счёт ${entry.ledgerAccountId} не найден`);
      }
      return {
        accountType: account.accountType,
        organizationId: account.organizationId ?? undefined,
        internalAccountId: account.internalAccountId ?? undefined,
        amountRub: new Decimal(entry.amountRub).negated().toFixed(2),
      };
    }),
  });
}
