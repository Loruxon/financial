import type { ReactNode } from "react";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function InternalTransfersSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireManagerOrNotFound("internal_transfers");
  return children;
}
