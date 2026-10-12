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
import {
  requestPaymentOrderCorrection,
  updatePaymentOrderAssignment,
} from "./actions";

beforeEach(() => {
  currentUserId = "manager_test";
  resetStore();
  const store = getStore();
  store.users.push(
    {
      id: "manager_test",
      username: "manager_test",
      name: "Test Manager",
      kind: "manager",
      hasFullManagerAccess: true,
      managerSections: [],
      organizationId: null,
      isActive: true,
    },
    {
      id: "manager_no_section",
      username: "manager_no_section",
      name: "No Section Manager",
      kind: "manager",
      hasFullManagerAccess: false,
      managerSections: ["ledger"],
      organizationId: null,
      isActive: true,
    },
    {
      id: "manager_inactive",
      username: "manager_inactive",
      name: "Inactive Manager",
      kind: "manager",
      hasFullManagerAccess: true,
      managerSections: [],
      organizationId: null,
      isActive: false,
    },
  );
  store.executionSchemes.push(
    {
      id: "scheme_active",
      name: "Active Scheme",
      calculator: "mongols",
      parameters: {},
      archivedAt: null,
    },
    {
      id: "scheme_archived",
      name: "Archived Scheme",
      calculator: "mongols",
      parameters: {},
      archivedAt: "2026-01-01T00:00:00.000Z",
    },
  );

  const order: PaymentOrder = {
    id: "po_test",
    organizationId: "org_test",
    status: "in_review",
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
  };
  store.paymentOrders.push(order);
});

describe("updatePaymentOrderAssignment", () => {
  it("rejects a manager without payment_orders section access", async () => {
    const result = await updatePaymentOrderAssignment({
      paymentOrderId: "po_test",
      assigneeUserId: "manager_no_section",
      executionSchemeId: null,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an inactive manager", async () => {
    const result = await updatePaymentOrderAssignment({
      paymentOrderId: "po_test",
      assigneeUserId: "manager_inactive",
      executionSchemeId: null,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an archived execution scheme", async () => {
    const result = await updatePaymentOrderAssignment({
      paymentOrderId: "po_test",
      assigneeUserId: null,
      executionSchemeId: "scheme_archived",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts an active manager with full access and an active scheme", async () => {
    const result = await updatePaymentOrderAssignment({
      paymentOrderId: "po_test",
      assigneeUserId: "manager_test",
      executionSchemeId: "scheme_active",
    });
    expect(result.ok).toBe(true);
  });
});

describe("requestPaymentOrderCorrection", () => {
  it("requires at least one canClientEdit* flag", async () => {
    const result = await requestPaymentOrderCorrection({
      paymentOrderId: "po_test",
      comment: "Please fix",
      canClientEditPayment: false,
      canClientEditPayer: false,
      canClientEditDocuments: false,
      canClientEditClosingDocuments: false,
    });
    expect(result.ok).toBe(false);
  });

  it("succeeds when at least one flag is set", async () => {
    const result = await requestPaymentOrderCorrection({
      paymentOrderId: "po_test",
      comment: "Please fix the amount",
      canClientEditPayment: true,
      canClientEditPayer: false,
      canClientEditDocuments: false,
      canClientEditClosingDocuments: false,
    });
    expect(result.ok).toBe(true);
  });
});
