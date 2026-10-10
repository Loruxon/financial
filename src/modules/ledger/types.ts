import type { IsoDateTime, Money } from "@/modules/shared/types";

export type LedgerAccountType =
  | "internal_account"
  | "organization_available"
  | "organization_held"
  | "execution_clearing"
  | "margin_revenue"
  | "opening_equity";

export type LedgerTransactionType =
  | "opening_balance"
  | "incoming_payment_confirmed"
  | "payment_order_hold"
  | "payment_order_hold_adjusted"
  | "payment_order_closed"
  | "internal_transfer_executed"
  | "outgoing_payment_executed"
  | "reversal";

export type LedgerAccount = {
  id: string;
  accountType: LedgerAccountType;
  /** Только для `organization_available` / `organization_held`. */
  organizationId: string | null;
  /** Только для `internal_account`. */
  internalAccountId: string | null;
};

export type LedgerTransaction = {
  id: string;
  transactionType: LedgerTransactionType;
  occurredAt: IsoDateTime;
  paymentOrderId: string | null;
  incomingPaymentId: string | null;
  internalTransferId: string | null;
  outgoingPaymentId: string | null;
  /** Для сторно: исходная проводка, которую эта отменяет. */
  reversesTransactionId: string | null;
  idempotencyKey: string;
  createdByUserId: string | null;
  comment: string;
};

export type LedgerEntry = {
  id: string;
  ledgerTransactionId: string;
  ledgerAccountId: string;
  /** Плюс — дебет, минус — кредит. */
  amountRub: Money;
};
