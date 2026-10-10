import type { ReactNode } from "react";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";

type FormSectionProps = {
  title: string;
  description?: string;
  /** Отдельные поля, каждое — `Field`. */
  children: ReactNode;
  /** Разделитель после секции. По умолчанию `true`, у последней секции формы ставьте `false`. */
  separator?: boolean;
};

/**
 * Раздел формы: заголовок, описание, поля на `Field`, разделитель после секции.
 *
 * @example
 * <FormSection title="Платёж">
 *   <Field>
 *     <FieldLabel htmlFor="amount">Сумма</FieldLabel>
 *     <MoneyInput id="amount" value={amount} onValueChange={setAmount} />
 *   </Field>
 * </FormSection>
 */
export function FormSection({
  title,
  description,
  children,
  separator = true,
}: FormSectionProps) {
  return (
    <>
      <FieldSet>
        <FieldLegend className="text-base font-semibold">{title}</FieldLegend>
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
        <FieldGroup>{children}</FieldGroup>
      </FieldSet>
      {separator ? <FieldSeparator /> : null}
    </>
  );
}
