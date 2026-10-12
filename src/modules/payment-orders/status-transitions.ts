import type { UserKind } from "@/modules/users/types";
import type { PaymentOrderStatus } from "./types";

type Transition = {
  from: PaymentOrderStatus;
  to: PaymentOrderStatus;
  allowedBy: UserKind;
};

/** Единственное место, где описаны переходы статусов заявки (раздел 6 target-design.md). */
export const PAYMENT_ORDER_TRANSITIONS: readonly Transition[] = [
  { from: "submitted", to: "in_review", allowedBy: "manager" },
  { from: "in_review", to: "sent_to_bank", allowedBy: "manager" },
  { from: "in_review", to: "needs_correction", allowedBy: "manager" },
  {
    from: "sent_to_bank",
    to: "awaiting_closing_documents",
    allowedBy: "client",
  },
  {
    from: "awaiting_closing_documents",
    to: "closing_documents_review",
    allowedBy: "client",
  },
  { from: "closing_documents_review", to: "closed", allowedBy: "manager" },
  {
    from: "closing_documents_review",
    to: "needs_correction",
    allowedBy: "manager",
  },
  { from: "needs_correction", to: "correction_review", allowedBy: "client" },
  { from: "correction_review", to: "in_review", allowedBy: "manager" },
  { from: "correction_review", to: "needs_correction", allowedBy: "manager" },
];

/**
 * Статусы, в которых разрешён расчёт для клиента и себестоимости
 * (`calculateClientCharge`, `calculateCost`). В `closed` расчёт запрещён —
 * пересчитывать после закрытия заявки нельзя.
 */
export const CALCULATION_ALLOWED_STATUSES: readonly PaymentOrderStatus[] = [
  "in_review",
  "sent_to_bank",
  "awaiting_closing_documents",
  "closing_documents_review",
  "correction_review",
];

export function canTransitionPaymentOrderStatus(
  from: PaymentOrderStatus,
  to: PaymentOrderStatus,
  userKind: UserKind,
): boolean {
  return PAYMENT_ORDER_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.allowedBy === userKind,
  );
}

export function getAllowedNextStatuses(
  from: PaymentOrderStatus,
  userKind: UserKind,
): PaymentOrderStatus[] {
  return PAYMENT_ORDER_TRANSITIONS.filter(
    (t) => t.from === from && t.allowedBy === userKind,
  ).map((t) => t.to);
}
