import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import type { ExecutionScheme } from "./types";

export async function listExecutionSchemes(): Promise<ExecutionScheme[]> {
  await requireManager("reference_data");
  await mockLatency();
  return getStore().executionSchemes.filter((s) => !s.archivedAt);
}

/** Для выбора схемы прямо в заявке — доступ к разделу «Заявки» достаточен. */
export async function listExecutionSchemesForAssignment(): Promise<
  ExecutionScheme[]
> {
  await requireManager("payment_orders");
  await mockLatency();
  return getStore().executionSchemes.filter((s) => !s.archivedAt);
}
