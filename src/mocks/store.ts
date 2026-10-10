import type { User } from "@/modules/users/types";
import type { Organization, Payer } from "@/modules/organizations/types";
import type {
  Beneficiary,
  BeneficiaryAccount,
  BeneficiaryBank,
} from "@/modules/beneficiaries/types";
import type { InternalAccount } from "@/modules/internal-accounts/types";
import type { ExecutionScheme } from "@/modules/execution-schemes/types";
import type { ExchangeRate } from "@/modules/exchange-rates/types";
import type {
  PaymentOrder,
  PaymentOrderFile,
  PaymentOrderStatusChange,
} from "@/modules/payment-orders/types";
import type { IncomingPayment } from "@/modules/incoming-payments/types";
import type { InternalTransfer } from "@/modules/internal-transfers/types";
import type {
  OutgoingPayment,
  Supplier,
} from "@/modules/outgoing-payments/types";
import type {
  LedgerAccount,
  LedgerEntry,
  LedgerTransaction,
} from "@/modules/ledger/types";
import { seed } from "./seed";

export type Store = {
  users: User[];
  organizations: Organization[];
  payers: Payer[];
  beneficiaries: Beneficiary[];
  beneficiaryBanks: BeneficiaryBank[];
  beneficiaryAccounts: BeneficiaryAccount[];
  internalAccounts: InternalAccount[];
  executionSchemes: ExecutionScheme[];
  exchangeRates: ExchangeRate[];
  paymentOrders: PaymentOrder[];
  paymentOrderStatusChanges: PaymentOrderStatusChange[];
  paymentOrderFiles: PaymentOrderFile[];
  incomingPayments: IncomingPayment[];
  internalTransfers: InternalTransfer[];
  outgoingPayments: OutgoingPayment[];
  suppliers: Supplier[];
  ledgerAccounts: LedgerAccount[];
  ledgerTransactions: LedgerTransaction[];
  ledgerEntries: LedgerEntry[];
};

function createEmptyStore(): Store {
  return {
    users: [],
    organizations: [],
    payers: [],
    beneficiaries: [],
    beneficiaryBanks: [],
    beneficiaryAccounts: [],
    internalAccounts: [],
    executionSchemes: [],
    exchangeRates: [],
    paymentOrders: [],
    paymentOrderStatusChanges: [],
    paymentOrderFiles: [],
    incomingPayments: [],
    internalTransfers: [],
    outgoingPayments: [],
    suppliers: [],
    ledgerAccounts: [],
    ledgerTransactions: [],
    ledgerEntries: [],
  };
}

let store: Store = createEmptyStore();
let nextId = 1;
/**
 * true только пока store ни разу не был инициализирован явно. `getStore()`
 * засевает его мок-данными ровно один раз на процесс — любой последующий
 * `resetStore()` (включая вызов изнутри `seed()`) снимает этот флаг, поэтому
 * тесты, которые сами управляют хранилищем, никогда не засеваются повторно.
 */
let autoSeedPending = true;

export function getStore(): Store {
  if (autoSeedPending) {
    autoSeedPending = false;
    seed();
  }
  return store;
}

/** Полностью очищает хранилище. Используется перед повторным засевом (тесты, hot reload). */
export function resetStore(): void {
  store = createEmptyStore();
  nextId = 1;
  autoSeedPending = false;
}

export function createId(prefix: string): string {
  return `${prefix}_${nextId++}`;
}

const latencyDisabled =
  process.env.MOCK_LATENCY === "false" || process.env.NODE_ENV === "test";

/** Имитирует задержку сети, чтобы на экранах были видны состояния загрузки. */
export async function mockLatency(): Promise<void> {
  if (latencyDisabled) return;
  const ms = 200 + Math.random() * 200;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
