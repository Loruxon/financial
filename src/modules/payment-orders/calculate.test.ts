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
import { getOrganizationAvailableBalance } from "@/modules/ledger/queries";
import {
  postOpeningBalance,
  postPaymentOrderHoldAdjusted,
} from "@/modules/ledger/post";
import type { PaymentOrder } from "./types";
import { calculateClientCharge } from "./actions";

const ORG_ID = "org_test";

beforeEach(() => {
  currentUserId = "manager_test";
  resetStore();
  const store = getStore();
  store.users.push({
    id: "manager_test",
    username: "manager_test",
    name: "Test Manager",
    kind: "manager",
    hasFullManagerAccess: true,
    managerSections: [],
    organizationId: null,
    isActive: true,
  });
  store.organizations.push({
    id: ORG_ID,
    name: "Test Org",
    clientFeePercent: "1",
    clientSwiftFee: "20.00",
    clientPricingMethod: "add_on",
  });

  const order: PaymentOrder = {
    id: "po_closed",
    organizationId: ORG_ID,
    status: "closed",
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
    fundingAmountRub: "90000.00",
    fundingDate: "2026-01-01",
    executionDate: "2026-01-02",
    clientExchangeRate: "90.0000",
    clientChargeRub: "89000.00",
    clientRemainderRub: "1000.00",
    costExecutionDate: "2026-01-02",
    costExchangeRate: "89.5000",
    costMarkupPercent: "0.2",
    costAmountRub: "87000.00",
    marginRub: "2000.00",
    isMinFeeApplied: false,
    costCalculation: null,
    isSwiftVisibleToClient: true,
    isOrderFormVisibleToClient: true,
    isExecutionVisibleToClient: true,
    canClientEditPayment: false,
    canClientEditPayer: false,
    canClientEditDocuments: false,
    canClientEditClosingDocuments: false,
    managerNote: "",
    submittedAt: "2026-01-01T09:00:00.000Z",
    closedAt: "2026-01-02T18:00:00.000Z",
    createdByUserId: "client_test",
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-02T18:00:00.000Z",
  };
  store.paymentOrders.push(order);
  store.paymentOrders.push({
    ...order,
    id: "po_in_review",
    status: "in_review",
    clientExchangeRate: null,
    clientChargeRub: null,
    clientRemainderRub: null,
  });

  postOpeningBalance({ internalAccountId: "ia_test", amountRub: "0.00" });
});

describe("calculateClientCharge", () => {
  it("errors in closed status and leaves the organization balance unchanged", async () => {
    const balanceBefore = getOrganizationAvailableBalance(ORG_ID);

    const result = await calculateClientCharge({
      paymentOrderId: "po_closed",
      executionDate: "2026-01-03",
      clientExchangeRate: "91.0000",
    });

    expect(result.ok).toBe(false);
    expect(getOrganizationAvailableBalance(ORG_ID)).toBe(balanceBefore);
  });

  it("posts exactly one adjustment when called twice with identical numbers", async () => {
    const heldBeforeFirstCall = "0.00";

    const first = await calculateClientCharge({
      paymentOrderId: "po_in_review",
      executionDate: "2026-01-03",
      clientExchangeRate: "91.0000",
    });
    expect(first.ok).toBe(true);
    const clientChargeRub =
      first.ok && first.data.clientChargeRub ? first.data.clientChargeRub : "";
    expect(clientChargeRub).not.toBe("");

    // Simulate a duplicate submission racing the first one: it builds its
    // idempotency key from order id + client charge, as calculateClientCharge
    // does, and reads the same pre-adjustment held amount the first call
    // read (before either committed) rather than the now-updated one. A
    // time-based key (the bug this guards against) would wrongly treat
    // this as a distinct transaction.
    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);
    postPaymentOrderHoldAdjusted({
      paymentOrderId: "po_in_review",
      organizationId: ORG_ID,
      heldAmountRub: heldBeforeFirstCall,
      clientChargeRub,
      idempotencyKey: `payment_order_hold_adjusted:po_in_review:${clientChargeRub}`,
    });
    vi.useRealTimers();

    const adjustments = getStore().ledgerTransactions.filter(
      (t) =>
        t.transactionType === "payment_order_hold_adjusted" &&
        t.paymentOrderId === "po_in_review",
    );
    expect(adjustments).toHaveLength(1);
  });
});
