import type { ReactNode } from "react";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function IncomingPaymentsSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireManagerOrNotFound("incoming_payments");
  return children;
}
