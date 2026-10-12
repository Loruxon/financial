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
import type { IncomingPayment } from "@/modules/incoming-payments/types";
import { submitPaymentOrder } from "./actions";

const ORG_ID = "org_test";
const OTHER_ORG_ID = "org_other";

function setupBaseFixtures(): void {
  const store = getStore();
  store.users.push({
    id: "client_test",
    username: "client_test",
    name: "Test Client",
    kind: "client",
    hasFullManagerAccess: false,
    managerSections: [],
    organizationId: ORG_ID,
    isActive: true,
  });
  store.organizations.push({
    id: ORG_ID,
    name: "Test Org",
    clientFeePercent: "1",
    clientSwiftFee: "20.00",
    clientPricingMethod: "add_on",
  });
  store.payers.push(
    {
      id: "payer_1",
      organizationId: ORG_ID,
      name: "Payer One",
      inn: "1111111111",
      archivedAt: null,
    },
    {
      id: "payer_2",
      organizationId: ORG_ID,
      name: "Payer Two",
      inn: "2222222222",
      archivedAt: null,
    },
    {
      id: "payer_other_org",
      organizationId: OTHER_ORG_ID,
      name: "Other Org Payer",
      inn: "3333333333",
      archivedAt: null,
    },
  );
  store.beneficiaries.push({
    id: "ben_1",
    organizationId: ORG_ID,
    name: "Beneficiary",
    address: "Addr",
    archivedAt: null,
  });
  store.beneficiaryBanks.push({
    id: "bank_1",
    beneficiaryId: "ben_1",
    name: "Bank",
    address: "Bank addr",
    swiftCode: "TESTBANK",
    bankType: "multi_currency",
    archivedAt: null,
  });
  store.beneficiaryAccounts.push({
    id: "acc_1",
    beneficiaryBankId: "bank_1",
    accountNumber: "ACC123",
    currencies: ["USD"],
    archivedAt: null,
  });
  store.internalAccounts.push({
    id: "ia_1",
    name: "Internal",
    isDefaultForOutgoing: true,
  });
}

function makeIncomingPayment(
  overrides: Partial<IncomingPayment>,
): IncomingPayment {
  const payment: IncomingPayment = {
    id: "ip_default",
    paymentDate: "2026-01-01",
    amountRub: "100000.00",
    internalAccountId: "ia_1",
    payerId: "payer_1",
    status: "confirmed",
    confirmedAt: "2026-01-01T10:00:00.000Z",
    confirmedByUserId: "manager_x",
    createdByUserId: "client_test",
    createdAt: "2026-01-01T09:00:00.000Z",
    ...overrides,
  };
  getStore().incomingPayments.push(payment);
  if (payment.status === "confirmed" && payment.internalAccountId) {
    postIncomingPaymentConfirmed({
      incomingPaymentId: payment.id,
      internalAccountId: payment.internalAccountId,
      organizationId:
        getStore().payers.find((p) => p.id === payment.payerId)
          ?.organizationId ?? ORG_ID,
      amountRub: payment.amountRub,
    });
  }
  return payment;
}

const baseInput = {
  invoiceNumber: "INV-1",
  amount: "1000.00",
  currency: "USD" as const,
  paymentDetails: "",
  beneficiaryId: "ben_1",
  beneficiaryBankId: "bank_1",
  beneficiaryAccountId: "acc_1",
  fundingAmountRub: "50000.00",
  files: [],
};

beforeEach(() => {
  currentUserId = "client_test";
  resetStore();
  setupBaseFixtures();
});

describe("submitPaymentOrder", () => {
  it("rejects an incoming payment belonging to another organization", async () => {
    const payment = makeIncomingPayment({
      id: "ip_foreign",
      payerId: "payer_other_org",
    });
    const result = await submitPaymentOrder({
      ...baseInput,
      incomingPaymentIds: [payment.id],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an unconfirmed incoming payment", async () => {
    const payment = makeIncomingPayment({
      id: "ip_pending",
      status: "pending",
      confirmedAt: null,
      confirmedByUserId: null,
    });
    const result = await submitPaymentOrder({
      ...baseInput,
      incomingPaymentIds: [payment.id],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects incoming payments from different payers", async () => {
    const p1 = makeIncomingPayment({ id: "ip_a", payerId: "payer_1" });
    const p2 = makeIncomingPayment({ id: "ip_b", payerId: "payer_2" });
    const result = await submitPaymentOrder({
      ...baseInput,
      incomingPaymentIds: [p1.id, p2.id],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects funding above the sum of the selected payments' remainders", async () => {
    const payment = makeIncomingPayment({
      id: "ip_small",
      amountRub: "10000.00",
    });
    const result = await submitPaymentOrder({
      ...baseInput,
      incomingPaymentIds: [payment.id],
      fundingAmountRub: "20000.00",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a currency the beneficiary account doesn't accept", async () => {
    const payment = makeIncomingPayment({ id: "ip_cur" });
    const result = await submitPaymentOrder({
      ...baseInput,
      incomingPaymentIds: [payment.id],
      currency: "EUR",
    });
    expect(result.ok).toBe(false);
  });

  it("returns an error, not an exception, for an invalid amount", async () => {
    const payment = makeIncomingPayment({ id: "ip_amount" });
    const result = await submitPaymentOrder({
      ...baseInput,
      incomingPaymentIds: [payment.id],
      amount: "abc",
    });
    expect(result.ok).toBe(false);
  });

  it("splits funding across two incoming payments by exactly the allocated share", async () => {
    const p1 = makeIncomingPayment({
      id: "ip_1",
      amountRub: "30000.00",
      paymentDate: "2026-01-01",
    });
    const p2 = makeIncomingPayment({
      id: "ip_2",
      amountRub: "30000.00",
      paymentDate: "2026-01-02",
    });
    const result = await submitPaymentOrder({
      ...baseInput,
      incomingPaymentIds: [p1.id, p2.id],
      fundingAmountRub: "40000.00",
    });
    expect(result.ok).toBe(true);

    const allocations = getStore().paymentOrderIncomingPayments;
    const a1 = allocations.find((a) => a.incomingPaymentId === p1.id);
    const a2 = allocations.find((a) => a.incomingPaymentId === p2.id);
    expect(a1?.allocatedAmountRub).toBe("30000.00");
    expect(a2?.allocatedAmountRub).toBe("10000.00");

    expect(result.ok && result.data.fundingDate).toBe("2026-01-02");
  });
});
