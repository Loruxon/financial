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
  createdByUserId: string | null;
  createdAt: IsoDateTime;
};

/**
 * Разнесение фондирования заявки по поступлениям — заготовка под будущую
 * таблицу `payment_order_incoming_payments` (раздел 5 target-design.md),
 * расширенную суммой распределения.
 */
export type PaymentOrderIncomingPaymentAllocation = {
  paymentOrderId: string;
  incomingPaymentId: string;
  allocatedAmountRub: Money;
};
