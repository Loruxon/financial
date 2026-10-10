import type { ReactNode } from "react";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function InternalAccountsSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireManagerOrNotFound("reference_data");
  return children;
}
