import { formatDateTime } from "@/lib/format";
import type { IsoDateTime } from "@/modules/shared/types";

export type StatusTimelineItem = {
  id: string;
  statusLabel: string;
  actorName: string | null;
  changedAt: IsoDateTime;
  comment?: string;
};

type StatusTimelineProps = {
  items: StatusTimelineItem[];
};

/**
 * Вертикальная история статусов: статус, кто и когда, комментарий.
 *
 * @example
 * <StatusTimeline items={changes.map(toTimelineItem)} />
 */
export function StatusTimeline({ items }: StatusTimelineProps) {
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="bg-foreground size-2 shrink-0 rounded-full" />
            {index < items.length - 1 ? (
              <span className="bg-border w-px flex-1" />
            ) : null}
          </div>
          <div className="flex flex-col gap-2 pb-4">
            <span className="text-sm font-medium">{item.statusLabel}</span>
            <span className="text-muted-foreground text-sm">
              {item.actorName ?? "—"} · {formatDateTime(item.changedAt)}
            </span>
            {item.comment ? <p className="text-sm">{item.comment}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
