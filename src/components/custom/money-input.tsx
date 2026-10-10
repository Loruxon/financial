"use client";

import { useState } from "react";
import { Decimal } from "decimal.js";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

type MoneyInputProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Суффикс валюты, например «₽» или «USD». */
  currencyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
};

function groupThousands(integerPart: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatForDisplay(raw: string): string {
  if (!raw) return "";
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const [intPart, ...rest] = body.split(/[.,]/);
  const separator = body.match(/[.,]/)?.[0];
  const prefix = negative ? "-" : "";
  if (!separator) return `${prefix}${groupThousands(intPart ?? "")}`;
  return `${prefix}${groupThousands(intPart ?? "")}${separator}${rest.join("")}`;
}

function normalize(raw: string): string {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned.endsWith("."))
    return "";
  try {
    return new Decimal(cleaned).toFixed(2);
  } catch {
    return "";
  }
}

/**
 * Ввод суммы с разделителями разрядов; запятая или точка как десятичный
 * разделитель. Наружу всегда отдаёт нормализованную строку `"1234.50"`.
 *
 * @example
 * <MoneyInput value={amount} onValueChange={setAmount} currencyLabel="₽" />
 */
export function MoneyInput({
  id,
  value,
  onValueChange,
  currencyLabel,
  placeholder,
  disabled,
  ...rest
}: MoneyInputProps) {
  const [display, setDisplay] = useState(() => formatForDisplay(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const [focused, setFocused] = useState(false);

  // Подхватываем внешние изменения value (например, сброс формы), но не пока
  // пользователь печатает. По правилам React это делается во время рендера,
  // а не в эффекте — иначе лишний повторный рендер на каждое изменение.
  if (!focused && value !== syncedValue) {
    setDisplay(formatForDisplay(value));
    setSyncedValue(value);
  }

  function handleChange(raw: string) {
    const sanitized = raw.replace(/[^\d.,\s-]/g, "");
    setDisplay(sanitized);
    onValueChange(normalize(sanitized));
  }

  const sharedProps = {
    id,
    inputMode: "decimal" as const,
    value: display,
    placeholder,
    disabled,
    className: "text-right font-mono tabular-nums",
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setDisplay(formatForDisplay(value));
      setSyncedValue(value);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      handleChange(e.target.value),
    ...rest,
  };

  if (!currencyLabel) return <Input {...sharedProps} />;

  return (
    <InputGroup>
      <InputGroupInput {...sharedProps} />
      <InputGroupAddon align="inline-end">{currencyLabel}</InputGroupAddon>
    </InputGroup>
  );
}
