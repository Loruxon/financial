import type {
  CurrencyCode,
  IsoDate,
  IsoDateTime,
  Money,
} from "@/modules/shared/types";

/** `"payment_order_42"` → `"42"` — для отображения «Заявка № 42». */
export function getPaymentOrderNumber(paymentOrderId: string): string {
  return /(\d+)$/.exec(paymentOrderId)?.[1] ?? paymentOrderId;
}

export type PaymentOrderStatus =
  | "submitted"
  | "in_review"
  | "sent_to_bank"
  | "awaiting_closing_documents"
  | "closing_documents_review"
  | "closed"
  | "needs_correction"
  | "correction_review";

export type PaymentOrderFileSection = "payment" | "closing" | "bank";

export type PaymentOrderFileType =
  | "invoice"
  | "contract_request"
  | "customs_declaration"
  | "transport"
  | "swift_confirmation"
  | "order_form"
  | "other";

export type PaymentOrderFile = {
  id: string;
  paymentOrderId: string;
  section: PaymentOrderFileSection;
  fileType: PaymentOrderFileType;
  isUploadedByManager: boolean;
  originalName: string;
  sizeBytes: number;
  uploadedByUserId: string | null;
  uploadedAt: IsoDateTime;
};

export type PaymentOrderStatusChange = {
  id: string;
  paymentOrderId: string;
  fromStatus: PaymentOrderStatus | null;
  toStatus: PaymentOrderStatus;
  changedByUserId: string | null;
  comment: string;
  changedAt: IsoDateTime;
};

export type PaymentOrder = {
  id: string;
  organizationId: string;
  status: PaymentOrderStatus;
  assigneeUserId: string | null;
  executionSchemeId: string | null;

  // платёж
  invoiceNumber: string;
  amount: Money | null;
  currency: CurrencyCode | null;
  paymentDetails: string;

  // получатель: снимок на момент подачи
  beneficiaryId: string | null;
  beneficiaryBankId: string | null;
  beneficiaryName: string;
  beneficiaryAddress: string;
  beneficiaryBankName: string;
  beneficiaryBankAddress: string;
  beneficiarySwiftCode: string;
  beneficiaryAccountNumber: string;
  beneficiaryAccountCurrencies: CurrencyCode[];

  // фондирование
  payerName: string;
  payerInn: string;
  internalAccountName: string;
  fundingAmountRub: Money | null;
  fundingDate: IsoDate | null;

  // расчёт для клиента
  executionDate: IsoDate | null;
  clientExchangeRate: string | null;
  clientChargeRub: Money | null;
  clientRemainderRub: Money | null;

  // себестоимость — только для менеджеров
  costExecutionDate: IsoDate | null;
  costExchangeRate: string | null;
  costMarkupPercent: string | null;
  costAmountRub: Money | null;
  marginRub: Money | null;
  isMinFeeApplied: boolean | null;
  costCalculation: unknown | null;

  // видимость и исправления
  isSwiftVisibleToClient: boolean;
  isOrderFormVisibleToClient: boolean;
  isExecutionVisibleToClient: boolean;
  canClientEditPayment: boolean;
  canClientEditPayer: boolean;
  canClientEditDocuments: boolean;
  canClientEditClosingDocuments: boolean;
  managerNote: string;

  submittedAt: IsoDateTime | null;
  closedAt: IsoDateTime | null;
  createdByUserId: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/**
 * То, что видит клиент: без себестоимости и маржи. `managerNote` остаётся —
 * клиент видит её только для чтения (раздел 8.2, шаг 05).
 */
export type ClientPaymentOrder = Omit<
  PaymentOrder,
  | "assigneeUserId"
  | "costExecutionDate"
  | "costExchangeRate"
  | "costMarkupPercent"
  | "costAmountRub"
  | "marginRub"
  | "isMinFeeApplied"
  | "costCalculation"
>;

export function toClientPaymentOrder(order: PaymentOrder): ClientPaymentOrder {
  /* eslint-disable @typescript-eslint/no-unused-vars -- destructuring to omit cost/margin fields */
  const {
    assigneeUserId,
    costExecutionDate,
    costExchangeRate,
    costMarkupPercent,
    costAmountRub,
    marginRub,
    isMinFeeApplied,
    costCalculation,
    ...clientOrder
  } = order;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return clientOrder;
}
