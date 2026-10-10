import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Под заголовком, например статус и номер. */
  meta?: ReactNode;
  /** Справа. Основная кнопка должна быть только одна (`variant="default"`). */
  actions?: ReactNode;
};

/**
 * Заголовок страницы: заголовок, необязательные подпись/метаданные и действия
 * справа. Используется на всех трёх шаблонах страниц.
 *
 * @example
 * <PageHeader title="Заявки" actions={<Button>Подать заявку</Button>} />
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {meta ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            {meta}
          </div>
        ) : null}
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
