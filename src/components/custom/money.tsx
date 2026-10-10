import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import type { CurrencyCode, Money as MoneyValue } from "@/modules/shared/types";

type MoneyProps = {
  value: MoneyValue;
  currency?: CurrencyCode;
  className?: string;
};

/**
 * Вывод денежной суммы: моноширинные цифры, выравнивание вправо, без цвета.
 *
 * @example
 * <Money value="1234567.89" currency="USD" />
 */
export function Money({ value, currency = "RUB", className }: MoneyProps) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatMoney(value, currency)}
    </span>
  );
}
