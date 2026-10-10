import type { ReactNode } from "react";
import { requireManagerOrNotFound } from "@/modules/auth/guards";

export default async function UsersSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireManagerOrNotFound("users");
  return children;
}
