import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import { getCurrentUser } from "@/modules/auth/session";
import { getOrganizationBalance as getLedgerOrganizationBalance } from "@/modules/ledger/queries";
import type { Money } from "@/modules/shared/types";
import type { Organization, Payer } from "./types";

async function requireOrganizationAccess(organizationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизован");
  if (user.kind === "client") {
    if (user.organizationId !== organizationId) {
      throw new Error("Организация не найдена");
    }
    return user;
  }
  await requireManager("reference_data");
  return user;
}

export async function listOrganizations(): Promise<Organization[]> {
  await requireManager("reference_data");
  await mockLatency();
  return getStore().organizations;
}

/** Для фильтров и колонок в заявках — доступ к разделу «Заявки» достаточен. */
export async function listOrganizationsForAssignment(): Promise<
  Organization[]
> {
  await requireManager("payment_orders");
  await mockLatency();
  return getStore().organizations;
}

export async function getOrganization(
  id: string,
): Promise<Organization | undefined> {
  await requireOrganizationAccess(id);
  await mockLatency();
  return getStore().organizations.find((o) => o.id === id);
}

export async function listPayers(organizationId: string): Promise<Payer[]> {
  await requireOrganizationAccess(organizationId);
  await mockLatency();
  return getStore().payers.filter(
    (p) => p.organizationId === organizationId && !p.archivedAt,
  );
}

export async function getOrganizationBalance(
  organizationId: string,
): Promise<{ available: Money; held: Money }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизован");
  if (user.kind === "client" && user.organizationId !== organizationId) {
    throw new Error("Организация не найдена");
  }
  if (user.kind === "manager") {
    await requireManager("organization_balances");
  }
  await mockLatency();
  return getLedgerOrganizationBalance(organizationId);
}
