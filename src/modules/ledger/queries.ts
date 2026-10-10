import { Decimal } from "decimal.js";
import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import type { Money } from "@/modules/shared/types";
import type { LedgerAccount, LedgerEntry } from "./types";

function sumEntries(predicate: (account: LedgerAccount) => boolean): Decimal {
  const store = getStore();
  const accountIds = new Set(
    store.ledgerAccounts.filter(predicate).map((account) => account.id),
  );
  return store.ledgerEntries
    .filter((entry: LedgerEntry) => accountIds.has(entry.ledgerAccountId))
    .reduce((acc, entry) => acc.plus(entry.amountRub), new Decimal(0));
}

/** Свободный остаток клиента: сколько можно тратить на новые заявки. */
export function getOrganizationAvailableBalance(organizationId: string): Money {
  return sumEntries(
    (a) =>
      a.accountType === "organization_available" &&
      a.organizationId === organizationId,
  )
    .negated()
    .toFixed(2);
}

/** Заморожено под заявки, которые ещё не закрыты. */
export function getOrganizationHeldBalance(organizationId: string): Money {
  return sumEntries(
    (a) =>
      a.accountType === "organization_held" &&
      a.organizationId === organizationId,
  )
    .negated()
    .toFixed(2);
}

export function getOrganizationBalance(organizationId: string): {
  available: Money;
  held: Money;
} {
  return {
    available: getOrganizationAvailableBalance(organizationId),
    held: getOrganizationHeldBalance(organizationId),
  };
}

/** Деньги на внутреннем счёте (ATL, CIC, ...). */
export function getInternalAccountBalance(internalAccountId: string): Money {
  return sumEntries(
    (a) =>
      a.accountType === "internal_account" &&
      a.internalAccountId === internalAccountId,
  ).toFixed(2);
}

/** Сколько ещё должны оплатить исполнителям по закрытым заявкам. */
export function getExecutionClearingBalance(): Money {
  return sumEntries((a) => a.accountType === "execution_clearing")
    .negated()
    .toFixed(2);
}

/** Накопленная маржа. */
export function getMarginRevenueBalance(): Money {
  return sumEntries((a) => a.accountType === "margin_revenue")
    .negated()
    .toFixed(2);
}

/**
 * Сколько по этой заявке сейчас заморожено (после всех удержаний и
 * корректировок). Используется при повторном расчёте, чтобы верно довести
 * удержание до новой суммы. Не проверяет права — вызывается из actions,
 * которые уже это сделали.
 */
export function getPaymentOrderHeldAmount(
  paymentOrderId: string,
  organizationId: string,
): Money {
  const store = getStore();
  const transactionIds = new Set(
    store.ledgerTransactions
      .filter((t) => t.paymentOrderId === paymentOrderId)
      .map((t) => t.id),
  );
  const heldAccountIds = new Set(
    store.ledgerAccounts
      .filter(
        (a) =>
          a.accountType === "organization_held" &&
          a.organizationId === organizationId,
      )
      .map((a) => a.id),
  );
  return store.ledgerEntries
    .filter(
      (entry) =>
        transactionIds.has(entry.ledgerTransactionId) &&
        heldAccountIds.has(entry.ledgerAccountId),
    )
    .reduce((sum, entry) => sum.plus(entry.amountRub), new Decimal(0))
    .negated()
    .toFixed(2);
}

export async function listLedgerEntries(filter?: { organizationId?: string }) {
  await requireManager("ledger");
  await mockLatency();
  const store = getStore();

  const accountIds = filter?.organizationId
    ? new Set(
        store.ledgerAccounts
          .filter((a) => a.organizationId === filter.organizationId)
          .map((a) => a.id),
      )
    : null;

  return store.ledgerEntries
    .filter((entry) => !accountIds || accountIds.has(entry.ledgerAccountId))
    .map((entry) => {
      const transaction = store.ledgerTransactions.find(
        (t) => t.id === entry.ledgerTransactionId,
      );
      const account = store.ledgerAccounts.find(
        (a) => a.id === entry.ledgerAccountId,
      );
      return { entry, transaction, account };
    })
    .sort((a, b) =>
      (b.transaction?.occurredAt ?? "").localeCompare(
        a.transaction?.occurredAt ?? "",
      ),
    );
}

/** Проводки по конкретной заявке — для карточки заявки, не раздела «Журнал проводок». */
export async function listLedgerEntriesForPaymentOrder(paymentOrderId: string) {
  await requireManager("payment_orders");
  await mockLatency();
  const store = getStore();
  const transactionIds = new Set(
    store.ledgerTransactions
      .filter((t) => t.paymentOrderId === paymentOrderId)
      .map((t) => t.id),
  );

  return store.ledgerEntries
    .filter((entry) => transactionIds.has(entry.ledgerTransactionId))
    .map((entry) => {
      const transaction = store.ledgerTransactions.find(
        (t) => t.id === entry.ledgerTransactionId,
      );
      const account = store.ledgerAccounts.find(
        (a) => a.id === entry.ledgerAccountId,
      );
      return { entry, transaction, account };
    })
    .sort((a, b) =>
      (b.transaction?.occurredAt ?? "").localeCompare(
        a.transaction?.occurredAt ?? "",
      ),
    );
}
