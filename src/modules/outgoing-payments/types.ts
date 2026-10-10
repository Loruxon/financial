import type { IsoDateTime, Money } from "@/modules/shared/types";

export type OutgoingPaymentStatus =
  "new" | "in_progress" | "in_execution" | "executed";

export type Supplier = {
  id: string;
  name: string;
  archivedAt: string | null;
};

export type OutgoingPayment = {
  id: string;
  invoiceNumber: string;
  status: OutgoingPaymentStatus;
  amountRub: Money | null;
  supplierId: string | null;
  /** Снимок имени поставщика на момент платежа. */
  supplierName: string;
  internalAccountId: string | null;
  /** Заявки, покрытые этим исходящим платежом. */
  paymentOrderIds: string[];
  executedAt: IsoDateTime | null;
  createdByUserId: string | null;
  createdAt: IsoDateTime;
};
