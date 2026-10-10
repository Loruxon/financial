"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buildBreadcrumbTitles } from "@/modules/navigation/config";

const TITLES = buildBreadcrumbTitles();

type BreadcrumbLabelContextValue = {
  label: string | null;
  setLabel: (label: string | null) => void;
};

const BreadcrumbLabelContext =
  createContext<BreadcrumbLabelContextValue | null>(null);

/**
 * Хранит название последнего уровня крошек для страниц без статического
 * заголовка в меню ([id], /new) — страница задаёт его сама через
 * {@link useBreadcrumbLabel}. См. CLAUDE.md, раздел «Хлебные крошки».
 */
export function BreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [label, setLabel] = useState<string | null>(null);
  const [labelPathname, setLabelPathname] = useState(pathname);

  if (pathname !== labelPathname) {
    setLabelPathname(pathname);
    setLabel(null);
  }

  return (
    <BreadcrumbLabelContext.Provider value={{ label, setLabel }}>
      {children}
    </BreadcrumbLabelContext.Provider>
  );
}

/**
 * Для страниц без статического заголовка ([id], /new): задаёт название
 * последнего уровня хлебных крошек, например «Заявка № 42».
 *
 * @example
 * useBreadcrumbLabel(`${messages.paymentOrders.titleOne} № ${number}`);
 */
export function useBreadcrumbLabel(label: string | null) {
  const ctx = useContext(BreadcrumbLabelContext);
  useLayoutEffect(() => {
    ctx?.setLabel(label);
    return () => ctx?.setLabel(null);
  }, [ctx, label]);
}

function resolveCrumbs(
  pathname: string,
  dynamicLabel: string | null,
): string[] {
  const exact = TITLES.get(pathname);
  if (exact) {
    return exact.groupTitle ? [exact.groupTitle, exact.title] : [exact.title];
  }

  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    segments.pop();
    const prefix = `/${segments.join("/")}`;
    const entry = TITLES.get(prefix);
    if (entry) {
      const ancestors = entry.groupTitle
        ? [entry.groupTitle, entry.title]
        : [entry.title];
      return dynamicLabel ? [...ancestors, dynamicLabel] : ancestors;
    }
  }
  return dynamicLabel ? [dynamicLabel] : [pathname];
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const ctx = useContext(BreadcrumbLabelContext);
  const crumbs = resolveCrumbs(pathname, ctx?.label ?? null);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <BreadcrumbListEntry key={crumb} isLast={index === crumbs.length - 1}>
            {crumb}
          </BreadcrumbListEntry>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function BreadcrumbListEntry({
  isLast,
  children,
}: {
  isLast: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbPage>{children}</BreadcrumbPage>
      </BreadcrumbItem>
      {isLast ? null : <BreadcrumbSeparator />}
    </>
  );
}
