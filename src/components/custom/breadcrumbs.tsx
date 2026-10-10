"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { buildBreadcrumbTitles } from "@/modules/navigation/config";

const TITLES = buildBreadcrumbTitles();

function titleForPath(pathname: string): string {
  if (TITLES.has(pathname)) return TITLES.get(pathname)!;

  // Для вложенных страниц ([id], /new) показываем заголовок раздела.
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    const prefix = `/${segments.join("/")}`;
    if (TITLES.has(prefix)) return TITLES.get(prefix)!;
    segments.pop();
  }
  return pathname;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{titleForPath(pathname)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
