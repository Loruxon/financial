"use server";

import { Decimal } from "decimal.js";
import { z } from "zod";
import { createId, getStore, mockLatency } from "@/mocks/store";
import { requireClient, requireManager } from "@/modules/auth/guards";
import { getCurrentUser } from "@/modules/auth/session";
import { getIncomingPaymentRemainder } from "@/modules/incoming-payments/queries";
import {
  getOrganizationAvailableBalance,
  getPaymentOrderHeldAmount,
} from "@/modules/ledger/queries";
import {
  postPaymentOrderClosed,
  postPaymentOrderHold,
  postPaymentOrderHoldAdjusted,
} from "@/modules/ledger/post";
import {
  isoDateSchema,
  moneySchema,
  percentSchema,
  rateSchema,
} from "@/modules/shared/schemas";
import type { ActionResult, CurrencyCode } from "@/modules/shared/types";
import { calculateClientChargeStub, calculateCostStub } from "./pricing";
import {
  CALCULATION_ALLOWED_STATUSES,
  canTransitionPaymentOrderStatus,
} from "./status-transitions";
import { toClientPaymentOrder } from "./types";
import type {
  ClientPaymentOrder,
  PaymentOrder,
  PaymentOrderFile,
  PaymentOrderFileType,
  PaymentOrderStatus,
} from "./types";

const CURRENCIES = [
  "RUB",
  "USD",
  "EUR",
  "CNY",
  "KZT",
] as const satisfies readonly CurrencyCode[];

const FILE_TYPES = [
  "invoice",
  "contract_request",
  "customs_declaration",
  "transport",
  "swift_confirmation",
  "order_form",
  "other",
] as const satisfies readonly PaymentOrderFileType[];

const fileInputSchema = z.object({
  fileType: z.enum(FILE_TYPES),
  originalName: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

const submitPaymentOrderSchema = z.object({
  invoiceNumber: z.string().min(1, "Укажите номер инвойса"),
  amount: moneySchema,
  currency: z.enum(CURRENCIES),
  paymentDetails: z.string().default(""),
  beneficiaryId: z.string().min(1, "Выберите контрагента"),
  beneficiaryBankId: z.string().min(1, "Выберите банк контрагента"),
  beneficiaryAccountId: z.string().min(1, "Выберите счёт контрагента"),
  incomingPaymentIds: z
    .array(z.string())
    .min(1, "Выберите хотя бы одно поступление"),
  fundingAmountRub: moneySchema,
  files: z.array(fileInputSchema).default([]),
});

export type SubmitPaymentOrderInput = z.infer<typeof submitPaymentOrderSchema>;

export async function submitPaymentOrder(
  input: SubmitPaymentOrderInput,
): Promise<ActionResult<ClientPaymentOrder>> {
  const parsed = submitPaymentOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const user = await requireClient();
  await mockLatency();
  const store = getStore();

  const beneficiary = store.beneficiaries.find(
    (b) =>
      b.id === parsed.data.beneficiaryId &&
      b.organizationId === user.organizationId,
  );
  if (!beneficiary) return { ok: false, error: "Контрагент не найден" };
  const bank = store.beneficiaryBanks.find(
    (b) =>
      b.id === parsed.data.beneficiaryBankId &&
      b.beneficiaryId === beneficiary.id,
  );
  if (!bank) return { ok: false, error: "Банк контрагента не найден" };
  const account = store.beneficiaryAccounts.find(
    (a) =>
      a.id === parsed.data.beneficiaryAccountId &&
      a.beneficiaryBankId === bank.id,
  );
  if (!account) return { ok: false, error: "Счёт контрагента не найден" };
  if (!account.currencies.includes(parsed.data.currency)) {
    return {
      ok: false,
      error: "Счёт контрагента не принимает выбранную валюту",
    };
  }

  // Плательщик и счёт зачисления — из выбранных поступлений, а не напрямую
  // от клиента: внутренние счета клиенту не показываются никогда.
  const incomingPayments = parsed.data.incomingPaymentIds.map((paymentId) =>
    store.incomingPayments.find((p) => p.id === paymentId),
  );
  if (incomingPayments.some((p) => !p)) {
    return { ok: false, error: "Поступление не найдено" };
  }
  const payments = incomingPayments as NonNullable<
    (typeof incomingPayments)[number]
  >[];

  for (const payment of payments) {
    if (payment.status !== "confirmed") {
      return { ok: false, error: "Поступление не подтверждено" };
    }
    const payer = payment.payerId
      ? store.payers.find((p) => p.id === payment.payerId)
      : undefined;
    if (!payer || payer.organizationId !== user.organizationId) {
      return {
        ok: false,
        error: "Поступление принадлежит другой организации",
      };
    }
  }
  const firstPayment = payments[0]!;
  if (
    payments.some(
      (p) =>
        p.payerId !== firstPayment.payerId ||
        p.internalAccountId !== firstPayment.internalAccountId,
    )
  ) {
    return {
      ok: false,
      error:
        "Выбранные поступления должны быть от одного плательщика и на один счёт зачисления",
    };
  }

  const remainders = payments.map((p) => ({
    payment: p,
    remainder: getIncomingPaymentRemainder(p),
  }));
  const totalRemainder = remainders.reduce(
    (sum, r) => sum.plus(r.remainder),
    new Decimal(0),
  );
  if (totalRemainder.lessThan(parsed.data.fundingAmountRub)) {
    return {
      ok: false,
      error: "Сумма фондирования больше остатка выбранных поступлений",
    };
  }
  const availableBalance = getOrganizationAvailableBalance(
    user.organizationId!,
  );
  if (new Decimal(availableBalance).lessThan(parsed.data.fundingAmountRub)) {
    return {
      ok: false,
      error: "Сумма фондирования больше свободного остатка организации",
    };
  }

  const payer = store.payers.find((p) => p.id === firstPayment.payerId)!;
  const internalAccount = firstPayment.internalAccountId
    ? store.internalAccounts.find(
        (a) => a.id === firstPayment.internalAccountId,
      )
    : undefined;
  const fundingDate = payments.reduce(
    (latest, p) => (p.paymentDate > latest ? p.paymentDate : latest),
    payments[0]!.paymentDate,
  );

  const now = new Date().toISOString();
  const id = createId("payment_order");

  const order: PaymentOrder = {
    id,
    organizationId: user.organizationId!,
    status: "submitted",
    assigneeUserId: null,
    executionSchemeId: null,

    invoiceNumber: parsed.data.invoiceNumber,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    paymentDetails: parsed.data.paymentDetails,

    beneficiaryId: beneficiary.id,
    beneficiaryBankId: bank.id,
    beneficiaryName: beneficiary.name,
    beneficiaryAddress: beneficiary.address,
    beneficiaryBankName: bank.name,
    beneficiaryBankAddress: bank.address,
    beneficiarySwiftCode: bank.swiftCode,
    beneficiaryAccountNumber: account.accountNumber,
    beneficiaryAccountCurrencies: account.currencies,

    payerName: payer.name,
    payerInn: payer.inn,
    internalAccountName: internalAccount?.name ?? "",
    fundingAmountRub: parsed.data.fundingAmountRub,
    fundingDate,

    executionDate: null,
    clientExchangeRate: null,
    clientChargeRub: null,
    clientRemainderRub: null,

    costExecutionDate: null,
    costExchangeRate: null,
    costMarkupPercent: null,
    costAmountRub: null,
    marginRub: null,
    isMinFeeApplied: null,
    costCalculation: null,

    isSwiftVisibleToClient: false,
    isOrderFormVisibleToClient: false,
    isExecutionVisibleToClient: false,
    canClientEditPayment: false,
    canClientEditPayer: false,
    canClientEditDocuments: false,
    canClientEditClosingDocuments: false,
    managerNote: "",

    submittedAt: now,
    closedAt: null,
    createdByUserId: user.id,
    createdAt: now,
    updatedAt: now,
  };
  store.paymentOrders.push(order);
  store.paymentOrderStatusChanges.push({
    id: createId("po_status_change"),
    paymentOrderId: id,
    fromStatus: null,
    toStatus: "submitted",
    changedByUserId: user.id,
    comment: "",
    changedAt: now,
  });

  postPaymentOrderHold({
    paymentOrderId: id,
    organizationId: user.organizationId!,
    amountRub: parsed.data.fundingAmountRub,
    createdByUserId: user.id,
  });

  // Распределяем сумму фондирования по поступлениям в порядке дат (сначала старые).
  let remainingToAllocate = new Decimal(parsed.data.fundingAmountRub);
  const sortedRemainders = [...remainders].sort((a, b) =>
    a.payment.paymentDate.localeCompare(b.payment.paymentDate),
  );
  for (const { payment, remainder } of sortedRemainders) {
    if (remainingToAllocate.lessThanOrEqualTo(0)) break;
    const allocated = Decimal.min(remainingToAllocate, remainder);
    if (allocated.greaterThan(0)) {
      store.paymentOrderIncomingPayments.push({
        paymentOrderId: id,
        incomingPaymentId: payment.id,
        allocatedAmountRub: allocated.toFixed(2),
      });
      remainingToAllocate = remainingToAllocate.minus(allocated);
    }
  }

  for (const file of parsed.data.files) {
    store.paymentOrderFiles.push({
      id: createId("po_file"),
      paymentOrderId: id,
      section: "payment",
      fileType: file.fileType,
      isUploadedByManager: false,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      uploadedByUserId: user.id,
      uploadedAt: now,
    });
  }

  return { ok: true, data: toClientPaymentOrder(order) };
}

const STATUSES = [
  "submitted",
  "in_review",
  "sent_to_bank",
  "awaiting_closing_documents",
  "closing_documents_review",
  "closed",
  "needs_correction",
  "correction_review",
] as const satisfies readonly PaymentOrderStatus[];

const changeStatusSchema = z.object({
  paymentOrderId: z.string().min(1),
  toStatus: z.enum(STATUSES),
  comment: z.string().optional(),
});

export type ChangePaymentOrderStatusInput = z.infer<typeof changeStatusSchema>;

export async function changePaymentOrderStatus(
  input: ChangePaymentOrderStatusInput,
): Promise<ActionResult<PaymentOrder | ClientPaymentOrder>> {
  const parsed = changeStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Не авторизован" };

  const store = getStore();
  const order = store.paymentOrders.find(
    (o) => o.id === parsed.data.paymentOrderId,
  );
  if (!order) return { ok: false, error: "Заявка не найдена" };

  if (user.kind === "client" && order.organizationId !== user.organizationId) {
    return { ok: false, error: "Заявка не найдена" };
  }
  if (user.kind === "manager") {
    try {
      await requireManager("payment_orders");
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }

  if (
    !canTransitionPaymentOrderStatus(
      order.status,
      parsed.data.toStatus,
      user.kind,
    )
  ) {
    return {
      ok: false,
      error: `Переход из статуса «${order.status}» в «${parsed.data.toStatus}» недопустим`,
    };
  }

  await mockLatency();
  const now = new Date().toISOString();

  if (parsed.data.toStatus === "closed") {
    if (!order.clientChargeRub || !order.costAmountRub || !order.marginRub) {
      return { ok: false, error: "Сначала выполните расчёт заявки" };
    }
    postPaymentOrderClosed({
      paymentOrderId: order.id,
      organizationId: order.organizationId,
      clientChargeRub: order.clientChargeRub,
      costAmountRub: order.costAmountRub,
      marginRub: order.marginRub,
      createdByUserId: user.id,
    });
    order.closedAt = now;
  }

  store.paymentOrderStatusChanges.push({
    id: createId("po_status_change"),
    paymentOrderId: order.id,
    fromStatus: order.status,
    toStatus: parsed.data.toStatus,
    changedByUserId: user.id,
    comment: parsed.data.comment ?? "",
    changedAt: now,
  });
  order.status = parsed.data.toStatus;
  order.updatedAt = now;

  return {
    ok: true,
    data: user.kind === "client" ? toClientPaymentOrder(order) : order,
  };
}

const calculateClientChargeSchema = z.object({
  paymentOrderId: z.string().min(1),
  executionDate: isoDateSchema,
  clientExchangeRate: rateSchema,
});

export type CalculateClientChargeInput = z.infer<
  typeof calculateClientChargeSchema
>;

/** Расчёт для клиента: заглушка этапа прототипа (раздел 5.1 target-design.md). */
export async function calculateClientCharge(
  input: CalculateClientChargeInput,
): Promise<ActionResult<PaymentOrder>> {
  const parsed = calculateClientChargeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const user = await requireManager("payment_orders");
  await mockLatency();
  const store = getStore();
  const order = store.paymentOrders.find(
    (o) => o.id === parsed.data.paymentOrderId,
  );
  if (!order) return { ok: false, error: "Заявка не найдена" };
  if (!CALCULATION_ALLOWED_STATUSES.includes(order.status)) {
    return {
      ok: false,
      error: `Расчёт недоступен в статусе «${order.status}»`,
    };
  }
  if (!order.amount) return { ok: false, error: "У заявки не указана сумма" };
  const organization = store.organizations.find(
    (o) => o.id === order.organizationId,
  );
  if (!organization) return { ok: false, error: "Организация не найдена" };

  const clientChargeRub = calculateClientChargeStub({
    amount: order.amount,
    clientExchangeRate: parsed.data.clientExchangeRate,
    clientFeePercent: organization.clientFeePercent,
  });
  const clientRemainderRub = order.fundingAmountRub
    ? new Decimal(order.fundingAmountRub).minus(clientChargeRub).toFixed(2)
    : null;

  const currentlyHeld = getPaymentOrderHeldAmount(
    order.id,
    order.organizationId,
  );
  if (
    new Decimal(currentlyHeld).greaterThan(0) ||
    new Decimal(clientChargeRub).greaterThan(0)
  ) {
    postPaymentOrderHoldAdjusted({
      paymentOrderId: order.id,
      organizationId: order.organizationId,
      heldAmountRub: currentlyHeld,
      clientChargeRub,
      createdByUserId: user.id,
      idempotencyKey: `payment_order_hold_adjusted:${order.id}:${Date.now()}`,
    });
  }

  order.executionDate = parsed.data.executionDate;
  order.clientExchangeRate = parsed.data.clientExchangeRate;
  order.clientChargeRub = clientChargeRub;
  order.clientRemainderRub = clientRemainderRub;
  order.updatedAt = new Date().toISOString();

  return { ok: true, data: order };
}

const calculateCostSchema = z.object({
  paymentOrderId: z.string().min(1),
  costExecutionDate: isoDateSchema,
  costExchangeRate: rateSchema,
  costMarkupPercent: percentSchema,
});

export type CalculateCostInput = z.infer<typeof calculateCostSchema>;

/** Себестоимость: заглушка этапа прототипа — «сумма × (1 + процент) × курс». */
export async function calculateCost(
  input: CalculateCostInput,
): Promise<ActionResult<PaymentOrder>> {
  const parsed = calculateCostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  await requireManager("payment_orders");
  await mockLatency();
  const store = getStore();
  const order = store.paymentOrders.find(
    (o) => o.id === parsed.data.paymentOrderId,
  );
  if (!order) return { ok: false, error: "Заявка не найдена" };
  if (!CALCULATION_ALLOWED_STATUSES.includes(order.status)) {
    return {
      ok: false,
      error: `Расчёт недоступен в статусе «${order.status}»`,
    };
  }
  if (!order.amount) return { ok: false, error: "У заявки не указана сумма" };
  if (!order.clientChargeRub) {
    return { ok: false, error: "Сначала выполните расчёт для клиента" };
  }

  const costAmountRub = calculateCostStub({
    amount: order.amount,
    costExchangeRate: parsed.data.costExchangeRate,
    costMarkupPercent: parsed.data.costMarkupPercent,
  });
  const marginRub = new Decimal(order.clientChargeRub)
    .minus(costAmountRub)
    .toFixed(2);

  order.costExecutionDate = parsed.data.costExecutionDate;
  order.costExchangeRate = parsed.data.costExchangeRate;
  order.costMarkupPercent = parsed.data.costMarkupPercent;
  order.costAmountRub = costAmountRub;
  order.marginRub = marginRub;
  order.isMinFeeApplied = false;
  order.costCalculation = {
    amount: order.amount,
    costExchangeRate: parsed.data.costExchangeRate,
    costMarkupPercent: parsed.data.costMarkupPercent,
  };
  order.updatedAt = new Date().toISOString();

  return { ok: true, data: order };
}

const updateAssignmentSchema = z.object({
  paymentOrderId: z.string().min(1),
  assigneeUserId: z.string().nullable(),
  executionSchemeId: z.string().nullable(),
});

export type UpdatePaymentOrderAssignmentInput = z.infer<
  typeof updateAssignmentSchema
>;

export async function updatePaymentOrderAssignment(
  input: UpdatePaymentOrderAssignmentInput,
): Promise<ActionResult<PaymentOrder>> {
  const parsed = updateAssignmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Некорректный запрос" };

  await requireManager("payment_orders");
  await mockLatency();
  const store = getStore();
  const order = store.paymentOrders.find(
    (o) => o.id === parsed.data.paymentOrderId,
  );
  if (!order) return { ok: false, error: "Заявка не найдена" };

  order.assigneeUserId = parsed.data.assigneeUserId;
  order.executionSchemeId = parsed.data.executionSchemeId;
  order.updatedAt = new Date().toISOString();

  return { ok: true, data: order };
}

const updateVisibilitySchema = z.object({
  paymentOrderId: z.string().min(1),
  isSwiftVisibleToClient: z.boolean(),
  isOrderFormVisibleToClient: z.boolean(),
  isExecutionVisibleToClient: z.boolean(),
});

export type UpdatePaymentOrderVisibilityInput = z.infer<
  typeof updateVisibilitySchema
>;

export async function updatePaymentOrderVisibility(
  input: UpdatePaymentOrderVisibilityInput,
): Promise<ActionResult<PaymentOrder>> {
  const parsed = updateVisibilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Некорректный запрос" };

  await requireManager("payment_orders");
  await mockLatency();
  const store = getStore();
  const order = store.paymentOrders.find(
    (o) => o.id === parsed.data.paymentOrderId,
  );
  if (!order) return { ok: false, error: "Заявка не найдена" };

  order.isSwiftVisibleToClient = parsed.data.isSwiftVisibleToClient;
  order.isOrderFormVisibleToClient = parsed.data.isOrderFormVisibleToClient;
  order.isExecutionVisibleToClient = parsed.data.isExecutionVisibleToClient;
  order.updatedAt = new Date().toISOString();

  return { ok: true, data: order };
}

const updateNoteSchema = z.object({
  paymentOrderId: z.string().min(1),
  managerNote: z.string(),
});

export type UpdatePaymentOrderNoteInput = z.infer<typeof updateNoteSchema>;

export async function updatePaymentOrderNote(
  input: UpdatePaymentOrderNoteInput,
): Promise<ActionResult<PaymentOrder>> {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Некорректный запрос" };

  await requireManager("payment_orders");
  await mockLatency();
  const store = getStore();
  const order = store.paymentOrders.find(
    (o) => o.id === parsed.data.paymentOrderId,
  );
  if (!order) return { ok: false, error: "Заявка не найдена" };

  order.managerNote = parsed.data.managerNote;
  order.updatedAt = new Date().toISOString();

  return { ok: true, data: order };
}

const requestCorrectionSchema = z.object({
  paymentOrderId: z.string().min(1),
  comment: z.string().min(1, "Опишите, что нужно исправить"),
  canClientEditPayment: z.boolean(),
  canClientEditPayer: z.boolean(),
  canClientEditDocuments: z.boolean(),
  canClientEditClosingDocuments: z.boolean(),
});

export type RequestPaymentOrderCorrectionInput = z.infer<
  typeof requestCorrectionSchema
>;

/** «Вернуть на исправление»: статус + разрешённые клиенту блоки + комментарий. */
export async function requestPaymentOrderCorrection(
  input: RequestPaymentOrderCorrectionInput,
): Promise<ActionResult<PaymentOrder>> {
  const parsed = requestCorrectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const user = await requireManager("payment_orders");
  const store = getStore();
  const order = store.paymentOrders.find(
    (o) => o.id === parsed.data.paymentOrderId,
  );
  if (!order) return { ok: false, error: "Заявка не найдена" };

  if (
    !canTransitionPaymentOrderStatus(
      order.status,
      "needs_correction",
      "manager",
    )
  ) {
    return {
      ok: false,
      error: `Переход из статуса «${order.status}» в «needs_correction» недопустим`,
    };
  }

  await mockLatency();
  const now = new Date().toISOString();

  store.paymentOrderStatusChanges.push({
    id: createId("po_status_change"),
    paymentOrderId: order.id,
    fromStatus: order.status,
    toStatus: "needs_correction",
    changedByUserId: user.id,
    comment: parsed.data.comment,
    changedAt: now,
  });

  order.status = "needs_correction";
  order.canClientEditPayment = parsed.data.canClientEditPayment;
  order.canClientEditPayer = parsed.data.canClientEditPayer;
  order.canClientEditDocuments = parsed.data.canClientEditDocuments;
  order.canClientEditClosingDocuments =
    parsed.data.canClientEditClosingDocuments;
  order.updatedAt = now;

  return { ok: true, data: order };
}

const addFileSchema = z.object({
  paymentOrderId: z.string().min(1),
  section: z.enum(["payment", "closing", "bank"]),
  fileType: z.enum(FILE_TYPES),
  originalName: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export type AddPaymentOrderFileInput = z.infer<typeof addFileSchema>;

/** Загрузка документа (клиентом в форме или менеджером в карточке). На этапе прототипа — только метаданные. */
export async function addPaymentOrderFile(
  input: AddPaymentOrderFileInput,
): Promise<ActionResult<PaymentOrderFile>> {
  const parsed = addFileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Не авторизован" };

  const store = getStore();
  const order = store.paymentOrders.find(
    (o) => o.id === parsed.data.paymentOrderId,
  );
  if (!order) return { ok: false, error: "Заявка не найдена" };
  if (user.kind === "client" && order.organizationId !== user.organizationId) {
    return { ok: false, error: "Заявка не найдена" };
  }
  if (user.kind === "manager") {
    try {
      await requireManager("payment_orders");
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }

  if (order.status === "closed") {
    return { ok: false, error: "Заявка закрыта, загрузка файлов недоступна" };
  }
  if (user.kind === "client") {
    if (parsed.data.section === "bank") {
      return { ok: false, error: "Загрузка в этот раздел недоступна" };
    }
    if (
      parsed.data.section === "payment" &&
      !(order.canClientEditDocuments && order.status === "needs_correction")
    ) {
      return { ok: false, error: "Загрузка в этот раздел недоступна" };
    }
    if (
      parsed.data.section === "closing" &&
      !(
        order.status === "awaiting_closing_documents" ||
        order.canClientEditClosingDocuments
      )
    ) {
      return { ok: false, error: "Загрузка в этот раздел недоступна" };
    }
  }

  await mockLatency();
  const file: PaymentOrderFile = {
    id: createId("po_file"),
    paymentOrderId: order.id,
    section: parsed.data.section,
    fileType: parsed.data.fileType,
    isUploadedByManager: user.kind === "manager",
    originalName: parsed.data.originalName,
    sizeBytes: parsed.data.sizeBytes,
    uploadedByUserId: user.id,
    uploadedAt: new Date().toISOString(),
  };
  store.paymentOrderFiles.push(file);

  return { ok: true, data: file };
}
