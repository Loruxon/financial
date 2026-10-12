import { Decimal } from "decimal.js";
import { getStore, mockLatency } from "@/mocks/store";
import { requireClient, requireManager } from "@/modules/auth/guards";
import type { Money } from "@/modules/shared/types";
import type { IncomingPayment, IncomingPaymentStatus } from "./types";

export type IncomingPaymentFilter = {
  status?: IncomingPaymentStatus;
};

/** Сколько от этого поступления уже распределено по заявкам. */
export function getAllocatedAmount(incomingPaymentId: string): Money {
  return getStore()
    .paymentOrderIncomingPayments.filter(
      (a) => a.incomingPaymentId === incomingPaymentId,
    )
    .reduce((sum, a) => sum.plus(a.allocatedAmountRub), new Decimal(0))
    .toFixed(2);
}

/** Остаток поступления: сумма минус уже распределённое по заявкам. */
export function getIncomingPaymentRemainder(payment: IncomingPayment): Money {
  return new Decimal(payment.amountRub)
    .minus(getAllocatedAmount(payment.id))
    .toFixed(2);
}

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
  const store = getStore();
  const incomingPaymentIds = new Set(
    store.paymentOrderIncomingPayments
      .filter((a) => a.paymentOrderId === paymentOrderId)
      .map((a) => a.incomingPaymentId),
  );
  return store.incomingPayments.filter((p) => incomingPaymentIds.has(p.id));
}

/**
 * Подтверждённые поступления организации клиента с остатком, ещё не
 * разнесённым по другим заявкам — для формы подачи новой заявки.
 */
export async function listConfirmedIncomingPaymentsForOrganization(): Promise<
  { payment: IncomingPayment; payerName: string; remainder: Money }[]
> {
  const user = await requireClient();
  await mockLatency();
  const store = getStore();
  const orgPayers = store.payers.filter(
    (p) => p.organizationId === user.organizationId,
  );
  const orgPayerIds = new Set(orgPayers.map((p) => p.id));
  const payerName = new Map(orgPayers.map((p) => [p.id, p.name]));

  return store.incomingPayments
    .filter(
      (p) =>
        p.status === "confirmed" && p.payerId && orgPayerIds.has(p.payerId),
    )
    .map((payment) => ({
      payment,
      payerName: payerName.get(payment.payerId!) ?? "",
      remainder: getIncomingPaymentRemainder(payment),
    }))
    .filter(({ remainder }) => new Decimal(remainder).greaterThan(0));
}
