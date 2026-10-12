import { Decimal } from "decimal.js";
import { createId, getStore, resetStore } from "./store";
import { addDays, createRng, int, moneyAmount, pick } from "./random";
import * as refs from "./seed-data";
import {
  postIncomingPaymentConfirmed,
  postInternalTransferExecuted,
  postOpeningBalance,
  postOutgoingPaymentExecuted,
  postPaymentOrderClosed,
  postPaymentOrderHold,
  postPaymentOrderHoldAdjusted,
} from "@/modules/ledger/post";
import type { IncomingPayment } from "@/modules/incoming-payments/types";
import type {
  PaymentOrder,
  PaymentOrderFile,
  PaymentOrderStatus,
  PaymentOrderStatusChange,
} from "@/modules/payment-orders/types";
import type { InternalTransfer } from "@/modules/internal-transfers/types";
import type { OutgoingPayment } from "@/modules/outgoing-payments/types";
import type { ExchangeRate } from "@/modules/exchange-rates/types";
import type { CurrencyCode } from "@/modules/shared/types";

const TODAY = "2026-10-09";
const SEED = 20261009;

const CLIENT_USER_BY_ORG: Record<string, string | undefined> = {
  org_alfa: "client.alfa",
  org_beta: "client.beta",
};

const CURRENCY_BASE_RATE: Record<CurrencyCode, number> = {
  USD: 92,
  EUR: 100,
  CNY: 12.7,
  KZT: 0.2,
  RUB: 1,
};

const NBK_BASE_RATE: Record<string, number> = {
  EUR: 480,
  CNY: 68,
};

/** Типичный путь статусов, которым заявка пришла в конечный статус. */
const STATUS_PATH: Record<PaymentOrderStatus, PaymentOrderStatus[]> = {
  submitted: ["submitted"],
  in_review: ["submitted", "in_review"],
  sent_to_bank: ["submitted", "in_review", "sent_to_bank"],
  awaiting_closing_documents: [
    "submitted",
    "in_review",
    "sent_to_bank",
    "awaiting_closing_documents",
  ],
  closing_documents_review: [
    "submitted",
    "in_review",
    "sent_to_bank",
    "awaiting_closing_documents",
    "closing_documents_review",
  ],
  closed: [
    "submitted",
    "in_review",
    "sent_to_bank",
    "awaiting_closing_documents",
    "closing_documents_review",
    "closed",
  ],
  needs_correction: ["submitted", "in_review", "needs_correction"],
  correction_review: [
    "submitted",
    "in_review",
    "needs_correction",
    "correction_review",
  ],
};

/** Статусы, по которым обязателен клиентский расчёт (заявка прошла калькуляцию). */
const CALCULATED_STATUSES = new Set<PaymentOrderStatus>([
  "sent_to_bank",
  "awaiting_closing_documents",
  "closing_documents_review",
  "closed",
]);

const CLIENT_PERFORMED_TRANSITION = new Set<string>([
  "sent_to_bank->awaiting_closing_documents",
  "awaiting_closing_documents->closing_documents_review",
  "needs_correction->correction_review",
]);

function seedReferenceData(): void {
  const store = getStore();
  store.users.push(...refs.users);
  store.organizations.push(...refs.organizations);
  store.payers.push(...refs.payers);
  store.beneficiaries.push(...refs.beneficiaries);
  store.beneficiaryBanks.push(...refs.beneficiaryBanks);
  store.beneficiaryAccounts.push(...refs.beneficiaryAccounts);
  store.internalAccounts.push(...refs.internalAccounts);
  store.executionSchemes.push(...refs.executionSchemes);
  store.suppliers.push(...refs.suppliers);
}

function seedOpeningBalances(): void {
  const occurredAt = `${addDays(TODAY, -90)}T00:00:00.000Z`;
  postOpeningBalance({
    internalAccountId: "ia_atl",
    amountRub: "5000000.00",
    occurredAt,
  });
  postOpeningBalance({
    internalAccountId: "ia_cic",
    amountRub: "8000000.00",
    occurredAt,
  });
  postOpeningBalance({
    internalAccountId: "ia_kz1",
    amountRub: "2000000.00",
    occurredAt,
  });
}

function seedExchangeRates(rng: () => number): void {
  const store = getStore();
  const rates: ExchangeRate[] = [];
  let cbrUsd = CURRENCY_BASE_RATE.USD;
  let cbrEur = CURRENCY_BASE_RATE.EUR;
  let cbrCny = CURRENCY_BASE_RATE.CNY;
  let nbkEur = NBK_BASE_RATE.EUR!;
  let nbkCny = NBK_BASE_RATE.CNY!;

  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const rateDate = addDays(TODAY, -daysAgo);
    cbrUsd += (rng() - 0.5) * 0.4;
    cbrEur += (rng() - 0.5) * 0.4;
    cbrCny += (rng() - 0.5) * 0.08;
    nbkEur += (rng() - 0.5) * 1.5;
    nbkCny += (rng() - 0.5) * 0.3;

    rates.push(
      { source: "cbr", rateDate, currency: "USD", rate: cbrUsd.toFixed(4) },
      { source: "cbr", rateDate, currency: "EUR", rate: cbrEur.toFixed(4) },
      { source: "cbr", rateDate, currency: "CNY", rate: cbrCny.toFixed(4) },
      { source: "nbk", rateDate, currency: "EUR", rate: nbkEur.toFixed(4) },
      { source: "nbk", rateDate, currency: "CNY", rate: nbkCny.toFixed(4) },
    );
  }
  store.exchangeRates.push(...rates);
}

function seedIncomingPayments(rng: () => number): IncomingPayment[] {
  const store = getStore();
  const created: IncomingPayment[] = [];

  for (let i = 0; i < 25; i++) {
    const org = pick(rng, refs.organizations);
    const orgPayers = refs.payers.filter((p) => p.organizationId === org.id);
    const payer = pick(rng, orgPayers);
    const internalAccount = pick(rng, refs.internalAccounts);
    const paymentDate = addDays(TODAY, -int(rng, 1, 45));
    const amountRub = moneyAmount(rng, 80_000, 2_500_000);
    const isConfirmed = rng() < 0.75;

    const id = createId("incoming_payment");
    const confirmedAt = isConfirmed
      ? `${paymentDate}T10:${int(rng, 10, 59)}:00.000Z`
      : null;
    const confirmedByUserId = isConfirmed
      ? pick(rng, ["manager.full", "manager.payments"])
      : null;

    const payment: IncomingPayment = {
      id,
      paymentDate,
      amountRub,
      internalAccountId: internalAccount.id,
      payerId: payer.id,
      status: isConfirmed ? "confirmed" : "pending",
      confirmedAt,
      confirmedByUserId,
      createdByUserId: CLIENT_USER_BY_ORG[org.id] ?? null,
      createdAt: `${paymentDate}T09:00:00.000Z`,
    };
    store.incomingPayments.push(payment);
    created.push(payment);

    if (isConfirmed) {
      postIncomingPaymentConfirmed({
        incomingPaymentId: id,
        internalAccountId: internalAccount.id,
        organizationId: org.id,
        amountRub,
        createdByUserId: confirmedByUserId,
        occurredAt: confirmedAt!,
      });
    }
  }

  return created;
}

function buildStatusHistory(
  paymentOrderId: string,
  path: PaymentOrderStatus[],
  endDate: string,
  clientUserId: string | null,
): PaymentOrderStatusChange[] {
  const changes: PaymentOrderStatusChange[] = [];
  const stepDays = 2;
  const startOffset = (path.length - 1) * stepDays;

  for (let i = 0; i < path.length; i++) {
    const toStatus = path[i]!;
    const fromStatus = i === 0 ? null : path[i - 1]!;
    const changedAt = `${addDays(endDate, -(startOffset - i * stepDays))}T12:00:00.000Z`;
    const key = fromStatus ? `${fromStatus}->${toStatus}` : "";
    const changedByUserId =
      fromStatus === null
        ? null
        : CLIENT_PERFORMED_TRANSITION.has(key)
          ? clientUserId
          : "manager.full";

    changes.push({
      id: createId("po_status_change"),
      paymentOrderId,
      fromStatus,
      toStatus,
      changedByUserId,
      comment: "",
      changedAt,
    });
  }
  return changes;
}

function seedPaymentOrders(
  rng: () => number,
  incomingPayments: IncomingPayment[],
): PaymentOrder[] {
  const store = getStore();
  const statuses: PaymentOrderStatus[] = [
    "submitted",
    "in_review",
    "sent_to_bank",
    "awaiting_closing_documents",
    "closing_documents_review",
    "closed",
    "needs_correction",
    "correction_review",
  ];
  const orders: PaymentOrder[] = [];
  const allocatedIncomingPaymentIds = new Set<string>();

  for (let i = 0; i < 30; i++) {
    const status = statuses[i % statuses.length]!;
    const org = pick(rng, refs.organizations);
    const orgBeneficiaries = refs.beneficiaries.filter(
      (b) => b.organizationId === org.id,
    );
    const beneficiary = pick(rng, orgBeneficiaries);
    const bank = refs.beneficiaryBanks.find(
      (b) => b.beneficiaryId === beneficiary.id,
    )!;
    const account = refs.beneficiaryAccounts.find(
      (a) => a.beneficiaryBankId === bank.id,
    )!;
    const currency = pick(rng, account.currencies);
    const orgPayers = refs.payers.filter((p) => p.organizationId === org.id);
    const payer = pick(rng, orgPayers);
    const internalAccount = pick(rng, refs.internalAccounts);
    const scheme = pick(rng, refs.executionSchemes);

    const amountRange: Record<CurrencyCode, [number, number]> = {
      USD: [5_000, 120_000],
      EUR: [5_000, 100_000],
      CNY: [40_000, 800_000],
      KZT: [500_000, 10_000_000],
      RUB: [500_000, 10_000_000],
    };
    const [min, max] = amountRange[currency];
    const amount = moneyAmount(rng, min, max);
    const baseRate = CURRENCY_BASE_RATE[currency];
    const fundingAmountRub = new Decimal(amount)
      .times(baseRate)
      .times(1.03)
      .toFixed(2);

    const submittedAtDate = addDays(TODAY, -int(rng, 5, 60));
    const executionDate = addDays(submittedAtDate, int(rng, 1, 5));

    const isCalculated = CALCULATED_STATUSES.has(status);
    const clientExchangeRate = isCalculated
      ? (baseRate * (1 + (rng() - 0.5) * 0.01)).toFixed(4)
      : null;
    const clientChargeRub = isCalculated
      ? new Decimal(fundingAmountRub).times(0.97 + rng() * 0.02).toFixed(2)
      : null;
    const feePercent = new Decimal(org.clientFeePercent).dividedBy(100);
    const marginRub = isCalculated
      ? new Decimal(clientChargeRub!)
          .times(feePercent.plus(rng() * 0.01))
          .toFixed(2)
      : null;
    const costAmountRub = isCalculated
      ? new Decimal(clientChargeRub!).minus(marginRub!).toFixed(2)
      : null;
    const clientRemainderRub = isCalculated
      ? new Decimal(fundingAmountRub).minus(clientChargeRub!).toFixed(2)
      : null;

    const id = createId("payment_order");
    const path = STATUS_PATH[status];
    const statusChanges = buildStatusHistory(
      id,
      path,
      submittedAtDate,
      CLIENT_USER_BY_ORG[org.id] ?? null,
    );
    store.paymentOrderStatusChanges.push(...statusChanges);

    const isLaterStage = status !== "submitted" && status !== "in_review";
    const canEditDuringCorrection = status === "needs_correction";

    const order: PaymentOrder = {
      id,
      organizationId: org.id,
      status,
      assigneeUserId: "manager.full",
      executionSchemeId: scheme.id,

      invoiceNumber: `INV-${2026}-${String(i + 1).padStart(4, "0")}`,
      amount,
      currency,
      paymentDetails: "Оплата по контракту",

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
      internalAccountName: internalAccount.name,
      fundingAmountRub,
      fundingDate: submittedAtDate,

      executionDate: isLaterStage ? executionDate : null,
      clientExchangeRate,
      clientChargeRub,
      clientRemainderRub,

      costExecutionDate: isCalculated ? executionDate : null,
      costExchangeRate: isCalculated
        ? (Number(clientExchangeRate) * (1 - rng() * 0.002)).toFixed(4)
        : null,
      costMarkupPercent: isCalculated ? "0.2" : null,
      costAmountRub,
      marginRub,
      isMinFeeApplied: isCalculated ? rng() < 0.15 : null,
      costCalculation: isCalculated
        ? { calculator: scheme.calculator, schemeId: scheme.id }
        : null,

      isSwiftVisibleToClient: isLaterStage,
      isOrderFormVisibleToClient: isLaterStage,
      isExecutionVisibleToClient: isLaterStage,
      canClientEditPayment: canEditDuringCorrection && rng() < 0.5,
      canClientEditPayer: canEditDuringCorrection && rng() < 0.5,
      canClientEditDocuments: canEditDuringCorrection,
      canClientEditClosingDocuments: false,
      managerNote:
        status === "needs_correction" || status === "correction_review"
          ? "Проверьте реквизиты получателя и приложите исправленный счёт."
          : "",

      submittedAt: `${submittedAtDate}T09:00:00.000Z`,
      closedAt: status === "closed" ? `${executionDate}T18:00:00.000Z` : null,
      createdByUserId: CLIENT_USER_BY_ORG[org.id] ?? null,
      createdAt: `${submittedAtDate}T09:00:00.000Z`,
      updatedAt: `${statusChanges[statusChanges.length - 1]!.changedAt}`,
    };

    store.paymentOrders.push(order);
    orders.push(order);

    // Проводки: заявка всегда проходит через удержание, а дальше — по статусу.
    postPaymentOrderHold({
      paymentOrderId: id,
      organizationId: org.id,
      amountRub: fundingAmountRub,
      createdByUserId: order.createdByUserId,
      occurredAt: order.submittedAt!,
    });
    if (isCalculated) {
      postPaymentOrderHoldAdjusted({
        paymentOrderId: id,
        organizationId: org.id,
        heldAmountRub: fundingAmountRub,
        clientChargeRub: clientChargeRub!,
        createdByUserId: "manager.full",
        occurredAt: `${executionDate}T12:00:00.000Z`,
      });
    }
    if (status === "closed") {
      postPaymentOrderClosed({
        paymentOrderId: id,
        organizationId: org.id,
        clientChargeRub: clientChargeRub!,
        costAmountRub: costAmountRub!,
        marginRub: marginRub!,
        createdByUserId: "manager.full",
        occurredAt: order.closedAt!,
      });
    }

    // Файлы — для заявок не в самом начале пути.
    if (isLaterStage) {
      const files: PaymentOrderFile[] = [
        {
          id: createId("po_file"),
          paymentOrderId: id,
          section: "payment",
          fileType: "invoice",
          isUploadedByManager: false,
          originalName: `invoice-${i + 1}.pdf`,
          sizeBytes: int(rng, 40_000, 900_000),
          uploadedByUserId: order.createdByUserId,
          uploadedAt: order.submittedAt!,
        },
        {
          id: createId("po_file"),
          paymentOrderId: id,
          section: "bank",
          fileType: "swift_confirmation",
          isUploadedByManager: true,
          originalName: `swift-${i + 1}.pdf`,
          sizeBytes: int(rng, 40_000, 900_000),
          uploadedByUserId: "manager.full",
          uploadedAt: order.updatedAt,
        },
      ];
      store.paymentOrderFiles.push(...files);
    }

    // Привязываем подтверждённое поступление того же клиента, если найдётся подходящее.
    if (isLaterStage) {
      const candidate = incomingPayments.find(
        (p) =>
          p.status === "confirmed" &&
          !allocatedIncomingPaymentIds.has(p.id) &&
          new Decimal(p.amountRub).gte(fundingAmountRub) &&
          refs.payers.find((payer2) => payer2.id === p.payerId)
            ?.organizationId === org.id,
      );
      if (candidate) {
        allocatedIncomingPaymentIds.add(candidate.id);
        store.paymentOrderIncomingPayments.push({
          paymentOrderId: id,
          incomingPaymentId: candidate.id,
          allocatedAmountRub: fundingAmountRub,
        });
      }
    }
  }

  return orders;
}

function seedInternalTransfers(rng: () => number): void {
  const store = getStore();
  const pairs: [string, string][] = [
    ["ia_cic", "ia_atl"],
    ["ia_atl", "ia_cic"],
    ["ia_cic", "ia_kz1"],
    ["ia_kz1", "ia_cic"],
    ["ia_atl", "ia_kz1"],
  ];

  pairs.forEach(([from, to], i) => {
    const transferDate = addDays(TODAY, -int(rng, 1, 30));
    const amountRub = moneyAmount(rng, 100_000, 1_500_000);
    const isExecuted = rng() < 0.7;
    const id = createId("internal_transfer");

    const transfer: InternalTransfer = {
      id,
      fromInternalAccountId: from,
      toInternalAccountId: to,
      amountRub,
      transferDate,
      status: isExecuted ? "executed" : "pending",
      payerId: null,
      note: i === 0 ? "Пополнение для текущих платежей" : "",
      createdByUserId: "manager.full",
      createdAt: `${transferDate}T08:00:00.000Z`,
    };
    store.internalTransfers.push(transfer);

    if (isExecuted) {
      postInternalTransferExecuted({
        internalTransferId: id,
        fromInternalAccountId: from,
        toInternalAccountId: to,
        amountRub,
        createdByUserId: "manager.full",
        occurredAt: `${transferDate}T08:00:00.000Z`,
      });
    }
  });
}

function seedOutgoingPayments(rng: () => number, orders: PaymentOrder[]): void {
  const store = getStore();
  const closedOrders = orders.filter(
    (o) => o.status === "closed" && o.costAmountRub,
  );

  for (let i = 0; i < 8; i++) {
    const supplier = pick(rng, refs.suppliers);
    const linkedOrder = closedOrders[i] ?? null;
    const amountRub = linkedOrder
      ? linkedOrder.costAmountRub!
      : moneyAmount(rng, 50_000, 900_000);
    const paymentDate = addDays(TODAY, -int(rng, 1, 40));
    const isExecuted = rng() < 0.65;
    const id = createId("outgoing_payment");
    const internalAccount = refs.internalAccounts.find(
      (a) => a.isDefaultForOutgoing,
    )!;

    const payment: OutgoingPayment = {
      id,
      invoiceNumber: `OUT-${2026}-${String(i + 1).padStart(3, "0")}`,
      status: isExecuted
        ? "executed"
        : pick(rng, ["new", "in_progress", "in_execution"]),
      amountRub,
      supplierId: supplier.id,
      supplierName: supplier.name,
      internalAccountId: internalAccount.id,
      paymentOrderIds: linkedOrder ? [linkedOrder.id] : [],
      executedAt: isExecuted ? `${paymentDate}T15:00:00.000Z` : null,
      createdByUserId: "manager.full",
      createdAt: `${paymentDate}T09:00:00.000Z`,
    };
    store.outgoingPayments.push(payment);

    if (isExecuted) {
      postOutgoingPaymentExecuted({
        outgoingPaymentId: id,
        internalAccountId: internalAccount.id,
        amountRub,
        createdByUserId: "manager.full",
        occurredAt: payment.executedAt!,
      });
    }
  }
}

export function seed(): void {
  resetStore();
  const rng = createRng(SEED);
  seedReferenceData();
  seedOpeningBalances();
  seedExchangeRates(rng);
  const incomingPayments = seedIncomingPayments(rng);
  const orders = seedPaymentOrders(rng, incomingPayments);
  seedInternalTransfers(rng);
  seedOutgoingPayments(rng, orders);
}
