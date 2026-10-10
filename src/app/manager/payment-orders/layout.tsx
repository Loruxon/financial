import type { ReactNode } from "react";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function PaymentOrdersSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireManagerOrNotFound("payment_orders");
  return children;
}
