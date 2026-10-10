import { Decimal } from "decimal.js";
import type { Money } from "@/modules/shared/types";

/**
 * Расчёт для клиента и себестоимости — заглушки этапа прототипа.
 * Настоящие калькуляторы (раздел 5.1 target-design.md) появятся на этапе 2.
 */

export function calculateClientChargeStub(input: {
  amount: Money;
  clientExchangeRate: string;
  clientFeePercent: string;
}): Money {
  return new Decimal(input.amount)
    .times(input.clientExchangeRate)
    .times(new Decimal(input.clientFeePercent).dividedBy(100).plus(1))
    .toFixed(2);
}

export function calculateCostStub(input: {
  amount: Money;
  costExchangeRate: string;
  costMarkupPercent: string;
}): Money {
  return new Decimal(input.amount)
    .times(new Decimal(input.costMarkupPercent).dividedBy(100).plus(1))
    .times(input.costExchangeRate)
    .toFixed(2);
}
