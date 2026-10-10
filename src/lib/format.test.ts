import { describe, expect, it } from "vitest";
import {
  formatAccountNumber,
  formatDate,
  formatDateTime,
  formatInn,
  formatMoney,
} from "./format";

const ruNumber = (n: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

describe("formatMoney", () => {
  it("formats rubles with the ₽ symbol by default", () => {
    expect(formatMoney("1234567.89")).toBe(`${ruNumber(1234567.89)} ₽`);
  });

  it("formats another currency with its code", () => {
    expect(formatMoney("12500", "USD")).toBe(`${ruNumber(12500)} USD`);
  });

  it("always shows exactly two decimal digits", () => {
    expect(formatMoney("100")).toBe(`${ruNumber(100)} ₽`);
  });

  it("keeps precision that Decimal can represent", () => {
    expect(formatMoney("0.005")).toBe(`${ruNumber(0.01)} ₽`);
  });
});

describe("formatDate", () => {
  it("converts ISO date to dd.mm.yyyy", () => {
    expect(formatDate("2026-10-09")).toBe("09.10.2026");
  });
});

describe("formatDateTime", () => {
  it("converts ISO datetime to dd.mm.yyyy hh:mm", () => {
    expect(formatDateTime("2026-10-09T14:05:00.000Z")).toBe("09.10.2026 14:05");
  });
});

describe("formatInn", () => {
  it("groups digits by 4 for readability", () => {
    expect(formatInn("7701234567")).toBe("7701 2345 67");
  });
});

describe("formatAccountNumber", () => {
  it("groups digits by 4 for readability", () => {
    expect(formatAccountNumber("40702810123456789012")).toBe(
      "4070 2810 1234 5678 9012",
    );
  });
});
