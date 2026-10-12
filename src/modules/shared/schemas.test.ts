import { describe, expect, it } from "vitest";
import {
  isoDateSchema,
  moneySchema,
  percentSchema,
  rateSchema,
} from "./schemas";

describe("moneySchema", () => {
  it("accepts a plain amount and normalizes to two decimals", () => {
    expect(moneySchema.parse("1234")).toBe("1234.00");
  });

  it("accepts a comma decimal separator", () => {
    expect(moneySchema.parse("1234,5")).toBe("1234.50");
  });

  it("rejects non-numeric input", () => {
    expect(moneySchema.safeParse("abc").success).toBe(false);
  });

  it("rejects negative amounts", () => {
    expect(moneySchema.safeParse("-5").success).toBe(false);
  });

  it("rejects more than two decimal places", () => {
    expect(moneySchema.safeParse("1.234").success).toBe(false);
  });

  it("rejects zero", () => {
    expect(moneySchema.safeParse("0").success).toBe(false);
  });
});

describe("rateSchema", () => {
  it("accepts up to six decimal places", () => {
    expect(rateSchema.parse("90.123456")).toBe("90.123456");
  });

  it("rejects more than six decimal places", () => {
    expect(rateSchema.safeParse("90.1234567").success).toBe(false);
  });

  it("rejects zero and negative rates", () => {
    expect(rateSchema.safeParse("0").success).toBe(false);
    expect(rateSchema.safeParse("-1").success).toBe(false);
  });
});

describe("percentSchema", () => {
  it("accepts zero and one hundred", () => {
    expect(percentSchema.parse("0")).toBe("0");
    expect(percentSchema.parse("100")).toBe("100");
  });

  it("rejects values above 100", () => {
    expect(percentSchema.safeParse("100.01").success).toBe(false);
  });

  it("rejects more than four decimal places", () => {
    expect(percentSchema.safeParse("1.23456").success).toBe(false);
  });
});

describe("isoDateSchema", () => {
  it("accepts a real calendar date", () => {
    expect(isoDateSchema.parse("2026-10-09")).toBe("2026-10-09");
  });

  it("rejects a malformed date string", () => {
    expect(isoDateSchema.safeParse("09.10.2026").success).toBe(false);
  });

  it("rejects a non-existent calendar date", () => {
    expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
  });
});
