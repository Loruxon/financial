import type { CurrencyCode, IsoDate } from "@/modules/shared/types";

export type ExchangeRateSource = "cbr" | "nbk";

export type ExchangeRate = {
  source: ExchangeRateSource;
  rateDate: IsoDate;
  currency: CurrencyCode;
  /** Рублей (cbr) или тенге (nbk) за 1 единицу валюты. */
  rate: string;
};
