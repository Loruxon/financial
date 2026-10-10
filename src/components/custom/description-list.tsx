import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DescriptionItem = {
  label: string;
  value: ReactNode;
};

type DescriptionListProps = {
  items: DescriptionItem[];
  columns?: 1 | 2;
};

/**
 * Сетка «подпись — значение». Пустое значение показывается как «—».
 * Помещается внутрь `section-card`, своего `Card` не создаёт (карточки не вкладываются).
 *
 * @example
 * <DescriptionList items={[{ label: "ИНН", value: "7701234567" }]} columns={2} />
 */
export function DescriptionList({ items, columns = 1 }: DescriptionListProps) {
  return (
    <dl
      className={cn(
        "grid gap-4",
        columns === 2 ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-2">
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="text-sm">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
