import type { ReactNode } from "react";
import { AppShell } from "@/components/custom/app-shell";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireManagerOrNotFound();
  return <AppShell user={user}>{children}</AppShell>;
}
