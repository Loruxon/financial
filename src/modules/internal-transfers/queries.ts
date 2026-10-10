import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import type { InternalTransfer } from "./types";

export async function listInternalTransfers(): Promise<InternalTransfer[]> {
  await requireManager("internal_transfers");
  await mockLatency();
  return [...getStore().internalTransfers].sort((a, b) =>
    b.transferDate.localeCompare(a.transferDate),
  );
}

export async function getInternalTransfer(
  id: string,
): Promise<InternalTransfer | undefined> {
  await requireManager("internal_transfers");
  await mockLatency();
  return getStore().internalTransfers.find((t) => t.id === id);
}
