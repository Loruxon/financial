"use server";

import { z } from "zod";
import { createId, getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import { postInternalTransferExecuted } from "@/modules/ledger/post";
import type { ActionResult } from "@/modules/shared/types";
import type { InternalTransfer } from "./types";

const createSchema = z.object({
  fromInternalAccountId: z.string().min(1),
  toInternalAccountId: z.string().min(1),
  amountRub: z.string().min(1, "Укажите сумму"),
  transferDate: z.string().min(1),
  note: z.string().default(""),
});

export async function createInternalTransfer(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult<InternalTransfer>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  if (parsed.data.fromInternalAccountId === parsed.data.toInternalAccountId) {
    return { ok: false, error: "Счёт списания и счёт получения совпадают" };
  }

  const user = await requireManager("internal_transfers");
  await mockLatency();
  const store = getStore();

  const now = new Date().toISOString();
  const transfer: InternalTransfer = {
    id: createId("internal_transfer"),
    fromInternalAccountId: parsed.data.fromInternalAccountId,
    toInternalAccountId: parsed.data.toInternalAccountId,
    amountRub: parsed.data.amountRub,
    transferDate: parsed.data.transferDate,
    status: "pending",
    payerId: null,
    note: parsed.data.note,
    createdByUserId: user.id,
    createdAt: now,
  };
  store.internalTransfers.push(transfer);

  return { ok: true, data: transfer };
}

const executeSchema = z.object({ internalTransferId: z.string().min(1) });

export async function executeInternalTransfer(
  input: z.infer<typeof executeSchema>,
): Promise<ActionResult<InternalTransfer>> {
  const parsed = executeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Некорректный запрос" };

  const user = await requireManager("internal_transfers");
  await mockLatency();
  const store = getStore();
  const transfer = store.internalTransfers.find(
    (t) => t.id === parsed.data.internalTransferId,
  );
  if (!transfer) return { ok: false, error: "Перевод не найден" };
  if (transfer.status === "executed") {
    return { ok: false, error: "Перевод уже исполнен" };
  }

  postInternalTransferExecuted({
    internalTransferId: transfer.id,
    fromInternalAccountId: transfer.fromInternalAccountId,
    toInternalAccountId: transfer.toInternalAccountId,
    amountRub: transfer.amountRub,
    createdByUserId: user.id,
  });
  transfer.status = "executed";

  return { ok: true, data: transfer };
}
