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
import { postIncomingPaymentConfirmed } from "@/modules/ledger/post";
import type { IncomingPayment } from "./types";
import { unconfirmIncomingPayment } from "./actions";

beforeEach(() => {
  currentUserId = "manager_test";
  resetStore();
  getStore().users.push({
    id: "manager_test",
    username: "manager_test",
    name: "Test Manager",
    kind: "manager",
    hasFullManagerAccess: true,
    managerSections: [],
    organizationId: null,
    isActive: true,
  });
});

function makeConfirmedPayment(): IncomingPayment {
  const payment: IncomingPayment = {
    id: "ip_test",
    paymentDate: "2026-01-01",
    amountRub: "100000.00",
    internalAccountId: "ia_1",
    payerId: "payer_1",
    status: "confirmed",
    confirmedAt: "2026-01-01T10:00:00.000Z",
    confirmedByUserId: "manager_test",
    createdByUserId: "client_test",
    createdAt: "2026-01-01T09:00:00.000Z",
  };
  getStore().incomingPayments.push(payment);
  postIncomingPaymentConfirmed({
    incomingPaymentId: payment.id,
    internalAccountId: "ia_1",
    organizationId: "org_test",
    amountRub: payment.amountRub,
  });
  return payment;
}

describe("unconfirmIncomingPayment", () => {
  it("errors when funding has been allocated from the payment to an order", async () => {
    const payment = makeConfirmedPayment();
    getStore().paymentOrderIncomingPayments.push({
      paymentOrderId: "payment_order_7",
      incomingPaymentId: payment.id,
      allocatedAmountRub: "50000.00",
    });

    const result = await unconfirmIncomingPayment({
      incomingPaymentId: payment.id,
    });
    expect(result.ok).toBe(false);
  });

  it("succeeds when nothing is allocated from the payment", async () => {
    const payment = makeConfirmedPayment();

    const result = await unconfirmIncomingPayment({
      incomingPaymentId: payment.id,
    });
    expect(result.ok).toBe(true);
  });
});
