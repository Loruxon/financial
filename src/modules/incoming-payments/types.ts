import type { IsoDate, IsoDateTime, Money } from "@/modules/shared/types";

export type IncomingPaymentStatus = "pending" | "confirmed";

export type IncomingPayment = {
  id: string;
  paymentDate: IsoDate;
  amountRub: Money;
  internalAccountId: string | null;
  payerId: string | null;
  status: IncomingPaymentStatus;
  confirmedAt: IsoDateTime | null;
  confirmedByUserId: string | null;
  /** Заявки, к которым привязано поступление. */
  paymentOrderIds: string[];
  createdByUserId: string | null;
  createdAt: IsoDateTime;
};
