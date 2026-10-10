import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import { getCurrentUser } from "@/modules/auth/session";
import { toClientPaymentOrder } from "./types";
import type {
  ClientPaymentOrder,
  PaymentOrder,
  PaymentOrderStatus,
} from "./types";

export type PaymentOrderFilter = {
  status?: PaymentOrderStatus;
  assigneeUserId?: string;
};

export async function listPaymentOrders(
  filter: PaymentOrderFilter = {},
): Promise<PaymentOrder[] | ClientPaymentOrder[]> {
  await mockLatency();
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизован");

  const store = getStore();
  let orders: PaymentOrder[];

  if (user.kind === "client") {
    orders = store.paymentOrders.filter(
      (o) => o.organizationId === user.organizationId,
    );
  } else {
    await requireManager("payment_orders");
    orders = store.paymentOrders;
  }

  if (filter.status) orders = orders.filter((o) => o.status === filter.status);
  if (filter.assigneeUserId) {
    orders = orders.filter((o) => o.assigneeUserId === filter.assigneeUserId);
  }

  return user.kind === "client" ? orders.map(toClientPaymentOrder) : orders;
}

export async function getPaymentOrder(
  id: string,
): Promise<PaymentOrder | ClientPaymentOrder | undefined> {
  await mockLatency();
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизован");

  const store = getStore();
  const order = store.paymentOrders.find((o) => o.id === id);
  if (!order) return undefined;

  if (user.kind === "client") {
    // Заявка другой организации неотличима от несуществующей.
    if (order.organizationId !== user.organizationId) return undefined;
    return toClientPaymentOrder(order);
  }

  await requireManager("payment_orders");
  return order;
}

export async function listPaymentOrderStatusChanges(paymentOrderId: string) {
  await mockLatency();
  const order = await getPaymentOrder(paymentOrderId);
  if (!order) return [];
  const store = getStore();
  return store.paymentOrderStatusChanges
    .filter((c) => c.paymentOrderId === paymentOrderId)
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt));
}

export async function listPaymentOrderFiles(paymentOrderId: string) {
  await mockLatency();
  const order = await getPaymentOrder(paymentOrderId);
  if (!order) return [];
  const store = getStore();
  return store.paymentOrderFiles.filter(
    (f) => f.paymentOrderId === paymentOrderId,
  );
}
