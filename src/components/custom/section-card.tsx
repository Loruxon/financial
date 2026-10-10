import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SectionCardProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Карточка блока карточки заявки/сущности: заголовок блока и необязательные
 * действия справа. Карточки не вкладываются друг в друга.
 *
 * @example
 * <SectionCard title="Платёж">...</SectionCard>
 */
export function SectionCard({ title, actions, children }: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}
