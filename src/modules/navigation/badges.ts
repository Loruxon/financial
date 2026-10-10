import { listIncomingPayments } from "@/modules/incoming-payments/queries";
import { listPaymentOrders } from "@/modules/payment-orders/queries";
import type { User } from "@/modules/users/types";
import type { BadgeKey } from "./config";

const CLIENT_ACTIONABLE_STATUSES = new Set([
  "sent_to_bank",
  "awaiting_closing_documents",
  "needs_correction",
]);

const MANAGER_ACTIONABLE_STATUSES = new Set([
  "submitted",
  "in_review",
  "closing_documents_review",
  "correction_review",
]);

async function getPaymentOrdersBadge(user: User): Promise<number> {
  const orders = await listPaymentOrders();
  const actionable =
    user.kind === "client"
      ? CLIENT_ACTIONABLE_STATUSES
      : MANAGER_ACTIONABLE_STATUSES;
  return orders.filter((o) => actionable.has(o.status)).length;
}

async function getIncomingPaymentsBadge(): Promise<number> {
  const pending = await listIncomingPayments({ status: "pending" });
  return pending.length;
}

/** Считает счётчики только для переданных ключей — чтобы не делать лишних запросов. */
export async function computeBadges(
  user: User,
  keys: Set<BadgeKey>,
): Promise<Record<BadgeKey, number>> {
  const result: Partial<Record<BadgeKey, number>> = {};

  if (keys.has("clientPaymentOrders")) {
    result.clientPaymentOrders = await getPaymentOrdersBadge(user);
  }
  if (keys.has("managerPaymentOrders")) {
    result.managerPaymentOrders = await getPaymentOrdersBadge(user);
  }
  if (keys.has("managerIncomingPayments")) {
    result.managerIncomingPayments = await getIncomingPaymentsBadge();
  }

  return {
    clientPaymentOrders: 0,
    managerPaymentOrders: 0,
    managerIncomingPayments: 0,
    ...result,
  };
}
