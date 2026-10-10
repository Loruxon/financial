"use server";

import { z } from "zod";
import { createId, getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import { postOutgoingPaymentExecuted } from "@/modules/ledger/post";
import type { ActionResult } from "@/modules/shared/types";
import type { OutgoingPayment } from "./types";

const createSchema = z.object({
  invoiceNumber: z.string().min(1),
  amountRub: z.string().min(1, "Укажите сумму"),
  supplierId: z.string().min(1, "Выберите поставщика"),
  internalAccountId: z.string().min(1),
  paymentOrderIds: z.array(z.string()).default([]),
});

export async function createOutgoingPayment(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult<OutgoingPayment>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const user = await requireManager("outgoing_payments");
  await mockLatency();
  const store = getStore();
  const supplier = store.suppliers.find((s) => s.id === parsed.data.supplierId);
  if (!supplier) return { ok: false, error: "Поставщик не найден" };

  const now = new Date().toISOString();
  const payment: OutgoingPayment = {
    id: createId("outgoing_payment"),
    invoiceNumber: parsed.data.invoiceNumber,
    status: "new",
    amountRub: parsed.data.amountRub,
    supplierId: supplier.id,
    supplierName: supplier.name,
    internalAccountId: parsed.data.internalAccountId,
    paymentOrderIds: parsed.data.paymentOrderIds,
    executedAt: null,
    createdByUserId: user.id,
    createdAt: now,
  };
  store.outgoingPayments.push(payment);

  return { ok: true, data: payment };
}

const executeSchema = z.object({ outgoingPaymentId: z.string().min(1) });

export async function executeOutgoingPayment(
  input: z.infer<typeof executeSchema>,
): Promise<ActionResult<OutgoingPayment>> {
  const parsed = executeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Некорректный запрос" };

  const user = await requireManager("outgoing_payments");
  await mockLatency();
  const store = getStore();
  const payment = store.outgoingPayments.find(
    (p) => p.id === parsed.data.outgoingPaymentId,
  );
  if (!payment) return { ok: false, error: "Платёж не найден" };
  if (payment.status === "executed")
    return { ok: false, error: "Платёж уже исполнен" };
  if (!payment.amountRub || !payment.internalAccountId) {
    return { ok: false, error: "У платежа не указаны сумма или счёт" };
  }

  const now = new Date().toISOString();
  postOutgoingPaymentExecuted({
    outgoingPaymentId: payment.id,
    internalAccountId: payment.internalAccountId,
    amountRub: payment.amountRub,
    createdByUserId: user.id,
  });
  payment.status = "executed";
  payment.executedAt = now;

  return { ok: true, data: payment };
}
