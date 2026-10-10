import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type StatProps = {
  label: string;
  value: ReactNode;
  caption?: string;
};

/**
 * Карточка с числом и подписью для обзорных страниц.
 *
 * @example
 * <Stat label="Свободный остаток" value={<Money value="1000000.00" />} />
 */
export function Stat({ label, value, caption }: StatProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-2xl font-semibold">{value}</span>
        {caption ? (
          <span className="text-muted-foreground text-sm">{caption}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}
