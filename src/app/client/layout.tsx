import type { ReactNode } from "react";
import { AppShell } from "@/components/custom/app-shell";
import { requireClientOrNotFound } from "@/modules/auth/guards";

export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireClientOrNotFound();
  return <AppShell user={user}>{children}</AppShell>;
}
