import { Decimal } from "decimal.js";
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/mocks/store";
import {
  getExecutionClearingBalance,
  getMarginRevenueBalance,
  getOrganizationBalance,
} from "./queries";
import {
  postIncomingPaymentConfirmed,
  postLedgerTransaction,
  postOpeningBalance,
  postPaymentOrderClosed,
  postPaymentOrderHold,
  postPaymentOrderHoldAdjusted,
  postReversal,
} from "./post";

beforeEach(() => {
  resetStore();
});

function expectEveryTransactionBalanced(): void {
  const store = getStore();
  expect(store.ledgerTransactions.length).toBeGreaterThan(0);
  for (const transaction of store.ledgerTransactions) {
    const sum = store.ledgerEntries
      .filter((e) => e.ledgerTransactionId === transaction.id)
      .reduce((acc, e) => acc.plus(e.amountRub), new Decimal(0));
    expect(
      sum.isZero(),
      `transaction ${transaction.id} sums to ${sum.toString()}`,
    ).toBe(true);
  }
}

describe("ledger", () => {
  it("поступление 1 000 000 → заявка с удержанием 600 000 → закрытие с расчётом 590 000", () => {
    postOpeningBalance({ internalAccountId: "ia_test", amountRub: "0.00" });

    postIncomingPaymentConfirmed({
      incomingPaymentId: "ip_1",
      internalAccountId: "ia_test",
      organizationId: "org_test",
      amountRub: "1000000.00",
    });
    expect(getOrganizationBalance("org_test")).toEqual({
      available: "1000000.00",
      held: "0.00",
    });

    postPaymentOrderHold({
      paymentOrderId: "po_1",
      organizationId: "org_test",
      amountRub: "600000.00",
    });
    expect(getOrganizationBalance("org_test")).toEqual({
      available: "400000.00",
      held: "600000.00",
    });

    postPaymentOrderHoldAdjusted({
      paymentOrderId: "po_1",
      organizationId: "org_test",
      heldAmountRub: "600000.00",
      clientChargeRub: "590000.00",
    });
    expect(getOrganizationBalance("org_test")).toEqual({
      available: "410000.00",
      held: "590000.00",
    });

    postPaymentOrderClosed({
      paymentOrderId: "po_1",
      organizationId: "org_test",
      clientChargeRub: "590000.00",
      costAmountRub: "500000.00",
      marginRub: "90000.00",
    });
    expect(getOrganizationBalance("org_test")).toEqual({
      available: "410000.00",
      held: "0.00",
    });
    expect(getExecutionClearingBalance()).toBe("500000.00");
    expect(getMarginRevenueBalance()).toBe("90000.00");

    expectEveryTransactionBalanced();
  });

  it("throws when entries of a transaction do not sum to zero", () => {
    expect(() =>
      postLedgerTransaction({
        transactionType: "opening_balance",
        idempotencyKey: "broken",
        entries: [
          {
            accountType: "internal_account",
            internalAccountId: "x",
            amountRub: "100.00",
          },
          { accountType: "opening_equity", amountRub: "-99.00" },
        ],
      }),
    ).toThrow(/не сбалансирована/);
  });

  it("is idempotent: the same idempotencyKey is only posted once", () => {
    postOpeningBalance({ internalAccountId: "ia_idem", amountRub: "100.00" });
    postOpeningBalance({ internalAccountId: "ia_idem", amountRub: "100.00" });
    const store = getStore();
    const transactions = store.ledgerTransactions.filter(
      (t) => t.idempotencyKey === "opening_balance:ia_idem",
    );
    expect(transactions).toHaveLength(1);
  });

  it("reverses a transaction with mirrored entries", () => {
    const original = postOpeningBalance({
      internalAccountId: "ia_rev",
      amountRub: "250.00",
    });
    postReversal(original.id);
    const store = getStore();
    const balance = store.ledgerEntries
      .filter((e) => {
        const account = store.ledgerAccounts.find(
          (a) => a.id === e.ledgerAccountId,
        );
        return (
          account?.accountType === "internal_account" &&
          account.internalAccountId === "ia_rev"
        );
      })
      .reduce((acc, e) => acc.plus(e.amountRub), new Decimal(0));
    expect(balance.isZero()).toBe(true);
    expectEveryTransactionBalanced();
  });
});
