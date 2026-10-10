import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUserId: string | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "mock_user_id" && currentUserId
        ? { name, value: currentUserId }
        : undefined,
  }),
}));

import { getStore, resetStore } from "@/mocks/store";
import { seed } from "@/mocks/seed";
import { getPaymentOrder, listPaymentOrders } from "./queries";

const COST_AND_MARGIN_FIELDS = [
  "assigneeUserId",
  "costExecutionDate",
  "costExchangeRate",
  "costMarkupPercent",
  "costAmountRub",
  "marginRub",
  "isMinFeeApplied",
  "costCalculation",
] as const;

beforeEach(() => {
  currentUserId = null;
  resetStore();
  seed();
});

describe("payment-orders access control", () => {
  it("client.alfa cannot read an order that belongs to org_beta", async () => {
    const betaOrder = getStore().paymentOrders.find(
      (o) => o.organizationId === "org_beta",
    );
    expect(betaOrder).toBeDefined();

    currentUserId = "client.alfa";
    const result = await getPaymentOrder(betaOrder!.id);
    expect(result).toBeUndefined();
  });

  it("client.alfa can read its own organization's order", async () => {
    const alfaOrder = getStore().paymentOrders.find(
      (o) => o.organizationId === "org_alfa",
    );
    expect(alfaOrder).toBeDefined();

    currentUserId = "client.alfa";
    const result = await getPaymentOrder(alfaOrder!.id);
    expect(result).toBeDefined();
    expect(result?.id).toBe(alfaOrder!.id);
  });

  it("ClientPaymentOrder never carries cost or margin fields", async () => {
    currentUserId = "client.alfa";
    const orders = await listPaymentOrders();
    expect(orders.length).toBeGreaterThan(0);

    for (const order of orders) {
      for (const field of COST_AND_MARGIN_FIELDS) {
        expect(Object.keys(order)).not.toContain(field);
      }
    }
  });

  it("manager.payments (no payment_orders section) cannot list orders", async () => {
    currentUserId = "manager.payments";
    await expect(listPaymentOrders()).rejects.toThrow();
  });

  it("manager.full (full access) can list orders", async () => {
    currentUserId = "manager.full";
    const orders = await listPaymentOrders();
    expect(orders.length).toBeGreaterThan(0);
  });

  it("with no logged-in user, queries are rejected", async () => {
    currentUserId = null;
    await expect(listPaymentOrders()).rejects.toThrow();
  });
});
