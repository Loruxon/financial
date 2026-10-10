export type UserKind = "client" | "manager";

export type ManagerSection =
  | "payment_orders"
  | "incoming_payment_confirmations"
  | "internal_transfers"
  | "incoming_payments"
  | "outgoing_payments"
  | "organization_balances"
  | "internal_account_balances"
  | "ledger"
  | "reference_data"
  | "users";

export type User = {
  id: string;
  username: string;
  name: string;
  kind: UserKind;
  /** Только для менеджеров. */
  hasFullManagerAccess: boolean;
  /** Только для менеджеров; игнорируется, если `hasFullManagerAccess`. */
  managerSections: ManagerSection[];
  /** Только для клиентов. */
  organizationId: string | null;
  isActive: boolean;
};
