import { getStore, mockLatency } from "@/mocks/store";
import { getCurrentUser } from "@/modules/auth/session";
import type { CurrencyCode } from "@/modules/shared/types";
import type { ExchangeRate, ExchangeRateSource } from "./types";

export async function listExchangeRates(filter?: {
  source?: ExchangeRateSource;
  currency?: CurrencyCode;
}): Promise<ExchangeRate[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизован");
  await mockLatency();
  let rates = getStore().exchangeRates;
  if (filter?.source) rates = rates.filter((r) => r.source === filter.source);
  if (filter?.currency)
    rates = rates.filter((r) => r.currency === filter.currency);
  return [...rates].sort((a, b) => b.rateDate.localeCompare(a.rateDate));
}

export async function getLatestExchangeRate(
  source: ExchangeRateSource,
  currency: CurrencyCode,
): Promise<ExchangeRate | undefined> {
  const rates = await listExchangeRates({ source, currency });
  return rates[0];
}
