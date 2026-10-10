"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/ru";

export type EntityComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type EntityComboboxProps = {
  id?: string;
  options: EntityComboboxOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onCreateNew?: () => void;
  createNewLabel?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
};

/**
 * Поиск и выбор сущности (контрагент, плательщик, поставщик) из списка,
 * опционально с пунктом «Добавить новый…».
 *
 * @example
 * <EntityCombobox
 *   options={beneficiaries.map((b) => ({ value: b.id, label: b.name }))}
 *   value={beneficiaryId}
 *   onValueChange={setBeneficiaryId}
 *   onCreateNew={() => setSheetOpen(true)}
 *   createNewLabel="Добавить контрагента"
 * />
 */
export function EntityCombobox({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  onCreateNew,
  createNewLabel,
  disabled,
  ...rest
}: EntityComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between font-normal"
            {...rest}
          />
        }
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected
            ? selected.label
            : (placeholder ?? messages.common.actions.search)}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder ?? messages.common.actions.search}
          />
          <CommandList>
            <CommandEmpty>
              {emptyText ?? messages.common.empty.noResults}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description ? (
                      <span className="text-muted-foreground text-sm">
                        {option.description}
                      </span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateNew ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                  >
                    <Plus className="size-4" />
                    {createNewLabel ?? messages.common.actions.create}
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
