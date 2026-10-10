import type { ReactNode } from "react";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function BalancesSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireManagerOrNotFound("organization_balances");
  return children;
}
