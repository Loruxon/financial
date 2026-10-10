import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { messages } from "@/messages/ru";
import type { CurrencyCode } from "@/modules/shared/types";

const ALL_CURRENCIES: CurrencyCode[] = ["RUB", "USD", "EUR", "CNY", "KZT"];

type CurrencySelectProps = {
  id?: string;
  value: CurrencyCode | undefined;
  onValueChange: (value: CurrencyCode) => void;
  /** Ограничивает список, например валютами выбранного счёта контрагента. */
  currencies?: CurrencyCode[];
  disabled?: boolean;
};

/**
 * Выбор валюты из `CurrencyCode`, список можно ограничить.
 *
 * @example
 * <CurrencySelect value={currency} onValueChange={setCurrency} currencies={account.currencies} />
 */
export function CurrencySelect({
  id,
  value,
  onValueChange,
  currencies = ALL_CURRENCIES,
  disabled,
}: CurrencySelectProps) {
  return (
    <Select
      items={currencies.map((code) => ({ value: code, label: code }))}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={messages.paymentOrders.fields.currency} />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((code) => (
          <SelectItem key={code} value={code}>
            {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
