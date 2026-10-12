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
import type { PaymentOrder } from "./types";
import { addPaymentOrderFile } from "./actions";

const ORG_ID = "org_test";

function makeOrder(overrides: Partial<PaymentOrder>): PaymentOrder {
  const order: PaymentOrder = {
    id: "po_test",
    organizationId: ORG_ID,
    status: "sent_to_bank",
    assigneeUserId: null,
    executionSchemeId: null,
    invoiceNumber: "INV-1",
    amount: "1000.00",
    currency: "USD",
    paymentDetails: "",
    beneficiaryId: null,
    beneficiaryBankId: null,
    beneficiaryName: "",
    beneficiaryAddress: "",
    beneficiaryBankName: "",
    beneficiaryBankAddress: "",
    beneficiarySwiftCode: "",
    beneficiaryAccountNumber: "",
    beneficiaryAccountCurrencies: [],
    payerName: "",
    payerInn: "",
    internalAccountName: "",
    fundingAmountRub: null,
    fundingDate: null,
    executionDate: null,
    clientExchangeRate: null,
    clientChargeRub: null,
    clientRemainderRub: null,
    costExecutionDate: null,
    costExchangeRate: null,
    costMarkupPercent: null,
    costAmountRub: null,
    marginRub: null,
    isMinFeeApplied: null,
    costCalculation: null,
    isSwiftVisibleToClient: false,
    isOrderFormVisibleToClient: false,
    isExecutionVisibleToClient: false,
    canClientEditPayment: false,
    canClientEditPayer: false,
    canClientEditDocuments: false,
    canClientEditClosingDocuments: false,
    managerNote: "",
    submittedAt: "2026-01-01T09:00:00.000Z",
    closedAt: null,
    createdByUserId: "client_test",
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-01T09:00:00.000Z",
    ...overrides,
  };
  getStore().paymentOrders.push(order);
  return order;
}

const fileInput = {
  paymentOrderId: "po_test",
  fileType: "invoice" as const,
  originalName: "doc.pdf",
  sizeBytes: 1000,
};

beforeEach(() => {
  currentUserId = "client_test";
  resetStore();
  getStore().users.push({
    id: "client_test",
    username: "client_test",
    name: "Test Client",
    kind: "client",
    hasFullManagerAccess: false,
    managerSections: [],
    organizationId: ORG_ID,
    isActive: true,
  });
});

describe("addPaymentOrderFile", () => {
  it("client cannot upload to the bank section", async () => {
    makeOrder({ status: "needs_correction", canClientEditDocuments: true });
    const result = await addPaymentOrderFile({
      ...fileInput,
      section: "bank",
    });
    expect(result.ok).toBe(false);
  });

  it("client cannot upload to payment without canClientEditDocuments in needs_correction", async () => {
    makeOrder({ status: "needs_correction", canClientEditDocuments: false });
    const result = await addPaymentOrderFile({
      ...fileInput,
      section: "payment",
    });
    expect(result.ok).toBe(false);
  });

  it("client can upload to payment when canClientEditDocuments is set in needs_correction", async () => {
    makeOrder({ status: "needs_correction", canClientEditDocuments: true });
    const result = await addPaymentOrderFile({
      ...fileInput,
      section: "payment",
    });
    expect(result.ok).toBe(true);
  });

  it("uploads are forbidden once the order is closed", async () => {
    makeOrder({ status: "closed", canClientEditDocuments: true });
    const result = await addPaymentOrderFile({
      ...fileInput,
      section: "payment",
    });
    expect(result.ok).toBe(false);
  });
});
