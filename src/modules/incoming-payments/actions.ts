"use server";

import { z } from "zod";
import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import {
  postIncomingPaymentConfirmed,
  postReversal,
} from "@/modules/ledger/post";
import type { ActionResult } from "@/modules/shared/types";
import type { IncomingPayment } from "./types";

const confirmSchema = z.object({ incomingPaymentId: z.string().min(1) });

export async function confirmIncomingPayment(
  input: z.infer<typeof confirmSchema>,
): Promise<ActionResult<IncomingPayment>> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Некорректный запрос" };

  const user = await requireManager("incoming_payment_confirmations");
  await mockLatency();
  const store = getStore();
  const payment = store.incomingPayments.find(
    (p) => p.id === parsed.data.incomingPaymentId,
  );
  if (!payment) return { ok: false, error: "Поступление не найдено" };
  if (payment.status === "confirmed") {
    return { ok: false, error: "Поступление уже подтверждено" };
  }
  if (!payment.internalAccountId || !payment.payerId) {
    return { ok: false, error: "У поступления не указаны счёт или плательщик" };
  }

  const payer = store.payers.find((p) => p.id === payment.payerId);
  if (!payer) return { ok: false, error: "Плательщик не найден" };

  const now = new Date().toISOString();
  postIncomingPaymentConfirmed({
    incomingPaymentId: payment.id,
    internalAccountId: payment.internalAccountId,
    organizationId: payer.organizationId,
    amountRub: payment.amountRub,
    createdByUserId: user.id,
  });

  payment.status = "confirmed";
  payment.confirmedAt = now;
  payment.confirmedByUserId = user.id;

  return { ok: true, data: payment };
}

export async function unconfirmIncomingPayment(
  input: z.infer<typeof confirmSchema>,
): Promise<ActionResult<IncomingPayment>> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Некорректный запрос" };

  const user = await requireManager("incoming_payment_confirmations");
  await mockLatency();
  const store = getStore();
  const payment = store.incomingPayments.find(
    (p) => p.id === parsed.data.incomingPaymentId,
  );
  if (!payment) return { ok: false, error: "Поступление не найдено" };
  if (payment.status !== "confirmed") {
    return { ok: false, error: "Поступление не подтверждено" };
  }

  const transaction = store.ledgerTransactions.find(
    (t) => t.idempotencyKey === `incoming_payment_confirmed:${payment.id}`,
  );
  if (transaction) {
    postReversal(transaction.id, {
      createdByUserId: user.id,
      comment: "Подтверждение поступления снято",
    });
  }

  payment.status = "pending";
  payment.confirmedAt = null;
  payment.confirmedByUserId = null;

  return { ok: true, data: payment };
}
