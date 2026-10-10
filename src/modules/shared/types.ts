/** Десятичная строка, например "1234567.89". Никогда не `number`. */
export type Money = string;

export type CurrencyCode = "RUB" | "USD" | "EUR" | "CNY" | "KZT";

/** `YYYY-MM-DD` */
export type IsoDate = string;

/** ISO 8601 с временем, UTC */
export type IsoDateTime = string;

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string };
