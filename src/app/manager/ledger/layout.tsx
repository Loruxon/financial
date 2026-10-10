import type { ReactNode } from "react";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function LedgerSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireManagerOrNotFound("ledger");
  return children;
}
