import type { ReactNode } from "react";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function OutgoingPaymentsSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireManagerOrNotFound("outgoing_payments");
  return children;
}
