import type { Organization, Payer } from "@/modules/organizations/types";
import type {
  Beneficiary,
  BeneficiaryAccount,
  BeneficiaryBank,
} from "@/modules/beneficiaries/types";
import type { InternalAccount } from "@/modules/internal-accounts/types";
import type { ExecutionScheme } from "@/modules/execution-schemes/types";
import type { Supplier } from "@/modules/outgoing-payments/types";
import type { User } from "@/modules/users/types";

export const organizations: Organization[] = [
  {
    id: "org_alfa",
    name: "ООО «Альфа Трейд»",
    clientFeePercent: "3",
    clientSwiftFee: "100",
    clientPricingMethod: "add_on",
  },
  {
    id: "org_beta",
    name: "ООО «Бета Импорт»",
    clientFeePercent: "2.5",
    clientSwiftFee: "100",
    clientPricingMethod: "add_on",
  },
  {
    id: "org_gamma",
    name: "ООО «Гамма Логистик»",
    clientFeePercent: "3.5",
    clientSwiftFee: "150",
    clientPricingMethod: "gross_up",
  },
];

export const payers: Payer[] = [
  {
    id: "payer_1",
    organizationId: "org_alfa",
    name: "ООО «Альфа Трейд»",
    inn: "7701234567",
    archivedAt: null,
  },
  {
    id: "payer_2",
    organizationId: "org_alfa",
    name: "ООО «Альфа Снаб»",
    inn: "7709876543",
    archivedAt: null,
  },
  {
    id: "payer_3",
    organizationId: "org_beta",
    name: "ООО «Бета Импорт»",
    inn: "7812345678",
    archivedAt: null,
  },
  {
    id: "payer_4",
    organizationId: "org_beta",
    name: "ИП Сидоров Алексей Викторович",
    inn: "781234567890",
    archivedAt: null,
  },
  {
    id: "payer_5",
    organizationId: "org_gamma",
    name: "ООО «Гамма Логистик»",
    inn: "5401234567",
    archivedAt: null,
  },
  {
    id: "payer_6",
    organizationId: "org_gamma",
    name: "ООО «Гамма Трейд»",
    inn: "5409876543",
    archivedAt: null,
  },
  {
    id: "payer_7",
    organizationId: "org_gamma",
    name: "ООО «Гамма Сервис»",
    inn: "5405555555",
    archivedAt: null,
  },
];

export const beneficiaries: Beneficiary[] = [
  {
    id: "ben_huawei",
    organizationId: "org_alfa",
    name: "Huawei Technologies Co., Ltd.",
    address: "Bantian, Longgang District, Shenzhen, China",
    archivedAt: null,
  },
  {
    id: "ben_mercedes",
    organizationId: "org_alfa",
    name: "Mercedes-Benz AG",
    address: "Mercedesstraße 120, 70372 Stuttgart, Germany",
    archivedAt: null,
  },
  {
    id: "ben_alibaba",
    organizationId: "org_beta",
    name: "Alibaba.com Hong Kong Ltd.",
    address: "26/F, Tower One, Times Square, Hong Kong",
    archivedAt: null,
  },
  {
    id: "ben_siemens",
    organizationId: "org_beta",
    name: "Siemens AG",
    address: "Werner-von-Siemens-Straße 1, 80333 München, Germany",
    archivedAt: null,
  },
  {
    id: "ben_lg",
    organizationId: "org_gamma",
    name: "LG Electronics Inc.",
    address: "128 Yeoui-daero, Yeongdeungpo-gu, Seoul, Korea",
    archivedAt: null,
  },
  {
    id: "ben_shandong",
    organizationId: "org_gamma",
    name: "Shandong Heavy Industry Group",
    address: "88 Gongye North Road, Jinan, Shandong, China",
    archivedAt: null,
  },
];

export const beneficiaryBanks: BeneficiaryBank[] = [
  {
    id: "bank_huawei",
    beneficiaryId: "ben_huawei",
    name: "China Construction Bank",
    address: "25 Financial Street, Beijing, China",
    swiftCode: "PCBCCNBJ",
    bankType: "multi_currency",
    archivedAt: null,
  },
  {
    id: "bank_mercedes",
    beneficiaryId: "ben_mercedes",
    name: "Deutsche Bank AG",
    address: "Taunusanlage 12, 60325 Frankfurt, Germany",
    swiftCode: "DEUTDEFF",
    bankType: "single_currency",
    archivedAt: null,
  },
  {
    id: "bank_alibaba",
    beneficiaryId: "ben_alibaba",
    name: "HSBC Hong Kong",
    address: "1 Queen's Road Central, Hong Kong",
    swiftCode: "HSBCHKHHHKH",
    bankType: "multi_currency",
    archivedAt: null,
  },
  {
    id: "bank_siemens",
    beneficiaryId: "ben_siemens",
    name: "Commerzbank AG",
    address: "Kaiserplatz, 60311 Frankfurt, Germany",
    swiftCode: "COBADEFF",
    bankType: "single_currency",
    archivedAt: null,
  },
  {
    id: "bank_lg",
    beneficiaryId: "ben_lg",
    name: "Kookmin Bank",
    address: "84 Yeoui-daero, Yeongdeungpo-gu, Seoul, Korea",
    swiftCode: "CZNBKRSE",
    bankType: "single_currency",
    archivedAt: null,
  },
  {
    id: "bank_shandong",
    beneficiaryId: "ben_shandong",
    name: "Bank of China",
    address: "1 Fuxingmen Inner Street, Beijing, China",
    swiftCode: "BKCHCNBJ",
    bankType: "multi_currency",
    archivedAt: null,
  },
];

export const beneficiaryAccounts: BeneficiaryAccount[] = [
  {
    id: "acc_huawei",
    beneficiaryBankId: "bank_huawei",
    accountNumber: "35100188920000000123",
    currencies: ["CNY", "USD"],
    archivedAt: null,
  },
  {
    id: "acc_mercedes",
    beneficiaryBankId: "bank_mercedes",
    accountNumber: "DE89370400440532013000",
    currencies: ["EUR"],
    archivedAt: null,
  },
  {
    id: "acc_alibaba",
    beneficiaryBankId: "bank_alibaba",
    accountNumber: "001234567890HK",
    currencies: ["USD", "CNY"],
    archivedAt: null,
  },
  {
    id: "acc_siemens",
    beneficiaryBankId: "bank_siemens",
    accountNumber: "DE12500105170648489890",
    currencies: ["EUR"],
    archivedAt: null,
  },
  {
    id: "acc_lg",
    beneficiaryBankId: "bank_lg",
    accountNumber: "004701234567890",
    currencies: ["USD"],
    archivedAt: null,
  },
  {
    id: "acc_shandong",
    beneficiaryBankId: "bank_shandong",
    accountNumber: "62100188930000004567",
    currencies: ["CNY", "USD"],
    archivedAt: null,
  },
];

export const internalAccounts: InternalAccount[] = [
  { id: "ia_atl", name: "ATL", isDefaultForOutgoing: false },
  { id: "ia_cic", name: "CIC", isDefaultForOutgoing: true },
  { id: "ia_kz1", name: "KZ-1", isDefaultForOutgoing: false },
];

export const executionSchemes: ExecutionScheme[] = [
  {
    id: "scheme_mongols",
    name: "Монголы",
    calculator: "mongols",
    parameters: {
      currencies: {
        USD: { feePercent: "1.4", swiftFee: "100" },
        EUR: { feePercent: "1.6", swiftFee: "100" },
        CNY: { feePercent: "1.2", swiftFee: "0" },
      },
    },
    archivedAt: null,
  },
  {
    id: "scheme_ermak",
    name: "Ермак",
    calculator: "ermak",
    parameters: {
      currencies: {
        USD: { feePercent: "1.1", swiftFee: "80" },
        EUR: { feePercent: "1.3", swiftFee: "80" },
      },
      minFeeRub: "15000",
    },
    archivedAt: null,
  },
  {
    id: "scheme_alsafi",
    name: "Альсафи",
    calculator: "alsafi",
    parameters: {
      currencies: {
        USD: { feePercent: "0.9", swiftFee: "50" },
        CNY: { feePercent: "0.8", swiftFee: "0" },
      },
      minFeeTenge: "25000",
    },
    archivedAt: null,
  },
  {
    id: "scheme_stavropol",
    name: "Ставрополь",
    calculator: "stavropol",
    parameters: {
      currencies: {
        EUR: {
          tiers: [
            { upTo: "50000", feePercent: "2.5", swiftFee: "100" },
            { upTo: null, feePercent: "1.5", swiftFee: "0" },
          ],
        },
        USD: {
          tiers: [
            { upTo: "50000", feePercent: "1.2", swiftFee: "100" },
            { upTo: null, feePercent: "1.2", swiftFee: "0" },
          ],
        },
      },
    },
    archivedAt: null,
  },
];

export const suppliers: Supplier[] = [
  { id: "supplier_1", name: "ИП Ковалёв (SWIFT-агент)", archivedAt: null },
  { id: "supplier_2", name: "Trade Finance Partners LLP", archivedAt: null },
  { id: "supplier_3", name: "Азия Клиринг ООО", archivedAt: null },
  { id: "supplier_4", name: "ООО «Платёжный мост»", archivedAt: null },
  { id: "supplier_5", name: "Eurasia Settlement OY", archivedAt: null },
];

export const users: User[] = [
  {
    id: "client.alfa",
    username: "client.alfa",
    name: "Ирина Волкова",
    kind: "client",
    hasFullManagerAccess: false,
    managerSections: [],
    organizationId: "org_alfa",
    isActive: true,
  },
  {
    id: "client.beta",
    username: "client.beta",
    name: "Дмитрий Назаров",
    kind: "client",
    hasFullManagerAccess: false,
    managerSections: [],
    organizationId: "org_beta",
    isActive: true,
  },
  {
    id: "manager.full",
    username: "manager.full",
    name: "Светлана Орлова",
    kind: "manager",
    hasFullManagerAccess: true,
    managerSections: [],
    organizationId: null,
    isActive: true,
  },
  {
    id: "manager.payments",
    username: "manager.payments",
    name: "Андрей Кузьмин",
    kind: "manager",
    hasFullManagerAccess: false,
    managerSections: [
      "incoming_payments",
      "incoming_payment_confirmations",
      "internal_transfers",
    ],
    organizationId: null,
    isActive: true,
  },
];
