import { Decimal } from "decimal.js";
import type {
  CurrencyCode,
  IsoDate,
  IsoDateTime,
  Money,
} from "@/modules/shared/types";

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  RUB: "₽",
  USD: "USD",
  EUR: "EUR",
  CNY: "CNY",
  KZT: "KZT",
};

/** `"1234567.89"` → `"1 234 567,89 ₽"` */
export function formatMoney(
  value: Money,
  currency: CurrencyCode = "RUB",
): string {
  const amount = new Decimal(value).toNumber();
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${CURRENCY_LABELS[currency]}`;
}

/** `"2026-10-09"` → `"09.10.2026"` */
export function formatDate(iso: IsoDate): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** `"2026-10-09T14:05:00.000Z"` → `"09.10.2026 14:05"` */
export function formatDateTime(iso: IsoDateTime): string {
  const [datePart, timePart] = iso.split("T");
  if (!datePart || !timePart) return formatDate(iso);
  const time = timePart.slice(0, 5);
  return `${formatDate(datePart)} ${time}`;
}

function groupDigits(value: string, groupSize: number): string {
  const groups: string[] = [];
  for (let i = 0; i < value.length; i += groupSize) {
    groups.push(value.slice(i, i + groupSize));
  }
  return groups.join(" ");
}

/** `"7701234567"` → `"7701 2345 67"` */
export function formatInn(inn: string): string {
  return groupDigits(inn, 4);
}

/** `"40702810123456789012"` → `"4070 2810 1234 5678 9012"` */
export function formatAccountNumber(accountNumber: string): string {
  return groupDigits(accountNumber, 4);
}

/** `734000` → `"717 КБ"` */
export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} Б`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} КБ`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}
