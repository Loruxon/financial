"use client";

import { useState } from "react";
import { ru } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { messages } from "@/messages/ru";
import type { IsoDate } from "@/modules/shared/types";

type DateFieldProps = {
  id?: string;
  value: IsoDate | null;
  onValueChange: (value: IsoDate | null) => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
};

function parseTyped(raw: string): IsoDate | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw);
  if (!match) return null;
  const [, dd, mm, yyyy] = match as unknown as [string, string, string, string];
  const day = Number(dd);
  const month = Number(mm);
  const date = new Date(Number(yyyy), month - 1, day);
  if (
    date.getFullYear() !== Number(yyyy) ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDate(iso: IsoDate | null): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date): IsoDate {
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Поле даты: ввод с клавиатуры `ДД.ММ.ГГГГ` или выбор в `Calendar`.
 * Значение — `IsoDate` (`YYYY-MM-DD`).
 *
 * @example
 * <DateField value={fundingDate} onValueChange={setFundingDate} />
 */
export function DateField({
  id,
  value,
  onValueChange,
  disabled,
  ...rest
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ? formatDate(value) : "");

  function handleTextChange(raw: string) {
    setText(raw);
    const parsed = parseTyped(raw);
    if (parsed) onValueChange(parsed);
  }

  function handleBlur() {
    setText(value ? formatDate(value) : "");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative flex items-center">
        <Input
          id={id}
          value={text}
          placeholder={messages.common.dateFormat.toUpperCase()}
          disabled={disabled}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          {...rest}
        />
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1"
              disabled={disabled}
            />
          }
        >
          <CalendarIcon />
        </PopoverTrigger>
      </div>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ru}
          selected={isoToDate(value)}
          onSelect={(date) => {
            if (!date) return;
            const iso = dateToIso(date);
            onValueChange(iso);
            setText(formatDate(iso));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
