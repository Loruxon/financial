import { Decimal } from "decimal.js";
import { z } from "zod";
import { messages } from "@/messages/ru";

function normalizeSeparator(raw: string): string {
  return raw.trim().replace(",", ".");
}

/**
 * Денежная сумма: положительное число, не больше 2 знаков после точки или
 * запятой. На выходе — нормализованная строка вида `"1234.50"`.
 */
export const moneySchema = z
  .string()
  .regex(/^\d+([.,]\d{1,2})?$/, messages.common.errors.invalidMoney)
  .transform(normalizeSeparator)
  .refine(
    (value) => new Decimal(value).greaterThan(0),
    messages.common.errors.invalidMoney,
  )
  .transform((value) => new Decimal(value).toFixed(2));

/** Курс обмена: положительное число, не больше 6 знаков после точки или запятой. */
export const rateSchema = z
  .string()
  .regex(/^\d+([.,]\d{1,6})?$/, messages.common.errors.invalidRate)
  .transform(normalizeSeparator)
  .refine(
    (value) => new Decimal(value).greaterThan(0),
    messages.common.errors.invalidRate,
  );

/** Процент: от 0 до 100, не больше 4 знаков после точки или запятой. */
export const percentSchema = z
  .string()
  .regex(/^\d+([.,]\d{1,4})?$/, messages.common.errors.invalidPercent)
  .transform(normalizeSeparator)
  .refine((value) => {
    const decimal = new Decimal(value);
    return decimal.greaterThanOrEqualTo(0) && decimal.lessThanOrEqualTo(100);
  }, messages.common.errors.invalidPercent);

function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yyyy, mm, dd] = match as unknown as [string, string, string, string];
  const year = Number(yyyy);
  const month = Number(mm);
  const day = Number(dd);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Дата `YYYY-MM-DD`, обязательно существующая в календаре. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, messages.common.errors.invalidDate)
  .refine(isRealDate, messages.common.errors.invalidDate);
