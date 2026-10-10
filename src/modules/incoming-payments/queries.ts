import { Decimal } from "decimal.js";
import { getStore, mockLatency } from "@/mocks/store";
import { requireClient, requireManager } from "@/modules/auth/guards";
import type { Money } from "@/modules/shared/types";
import type { IncomingPayment, IncomingPaymentStatus } from "./types";

export type IncomingPaymentFilter = {
  status?: IncomingPaymentStatus;
};

export async function listIncomingPayments(
  filter: IncomingPaymentFilter = {},
): Promise<IncomingPayment[]> {
  await requireManager("incoming_payments");
  await mockLatency();
  const store = getStore();
  let payments = store.incomingPayments;
  if (filter.status)
    payments = payments.filter((p) => p.status === filter.status);
  return [...payments].sort((a, b) =>
    b.paymentDate.localeCompare(a.paymentDate),
  );
}

export async function getIncomingPayment(
  id: string,
): Promise<IncomingPayment | undefined> {
  await requireManager("incoming_payments");
  await mockLatency();
  return getStore().incomingPayments.find((p) => p.id === id);
}

/** Поступления, привязанные к заявке — для карточки заявки, не раздела «Поступления». */
export async function listIncomingPaymentsForPaymentOrder(
  paymentOrderId: string,
): Promise<IncomingPayment[]> {
  await requireManager("payment_orders");
  await mockLatency();
  return getStore().incomingPayments.filter((p) =>
    p.paymentOrderIds.includes(paymentOrderId),
  );
}

/**
 * Подтверждённые поступления организации клиента с остатком, ещё не
 * разнесённым по другим заявкам — для формы подачи новой заявки.
 */
export async function listConfirmedIncomingPaymentsForOrganization(): Promise<
  { payment: IncomingPayment; remainder: Money }[]
> {
  const user = await requireClient();
  await mockLatency();
  const store = getStore();
  const orgPayerIds = new Set(
    store.payers
      .filter((p) => p.organizationId === user.organizationId)
      .map((p) => p.id),
  );

  return store.incomingPayments
    .filter(
      (p) =>
        p.status === "confirmed" && p.payerId && orgPayerIds.has(p.payerId),
    )
    .map((payment) => {
      const allocated = payment.paymentOrderIds.reduce((sum, orderId) => {
        const order = store.paymentOrders.find((o) => o.id === orderId);
        return order?.fundingAmountRub ? sum.plus(order.fundingAmountRub) : sum;
      }, new Decimal(0));
      const remainder = new Decimal(payment.amountRub)
        .minus(allocated)
        .toFixed(2);
      return { payment, remainder };
    })
    .filter(({ remainder }) => new Decimal(remainder).greaterThan(0));
}
