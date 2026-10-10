import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { seed } from "./seed";
import { getStore, resetStore } from "./store";

describe("seed (smoke)", () => {
  it("populates the store without throwing and keeps every ledger transaction balanced", () => {
    seed();
    const store = getStore();

    expect(store.organizations.length).toBe(3);
    expect(store.paymentOrders.length).toBe(30);
    expect(store.incomingPayments.length).toBe(25);
    expect(store.internalTransfers.length).toBe(5);
    expect(store.outgoingPayments.length).toBe(8);
    expect(store.ledgerTransactions.length).toBeGreaterThan(0);

    const statuses = new Set(store.paymentOrders.map((o) => o.status));
    expect(statuses.size).toBe(8);

    for (const transaction of store.ledgerTransactions) {
      const entries = store.ledgerEntries.filter(
        (e) => e.ledgerTransactionId === transaction.id,
      );
      const sum = entries.reduce(
        (acc, e) => acc.plus(e.amountRub),
        new Decimal(0),
      );
      expect(sum.isZero()).toBe(true);
    }
  });

  it("is fully deterministic: re-seeding produces byte-identical data", () => {
    seed();
    const first = JSON.stringify(getStore());

    resetStore();
    seed();
    const second = JSON.stringify(getStore());

    expect(second).toBe(first);
  });
});
