import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import type { OutgoingPayment } from "./types";

export async function listOutgoingPayments(): Promise<OutgoingPayment[]> {
  await requireManager("outgoing_payments");
  await mockLatency();
  return [...getStore().outgoingPayments].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getOutgoingPayment(
  id: string,
): Promise<OutgoingPayment | undefined> {
  await requireManager("outgoing_payments");
  await mockLatency();
  return getStore().outgoingPayments.find((p) => p.id === id);
}

export async function listSuppliers() {
  await requireManager("outgoing_payments");
  await mockLatency();
  return getStore().suppliers.filter((s) => !s.archivedAt);
}
