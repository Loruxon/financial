import type { CurrencyCode } from "@/modules/shared/types";

export type BeneficiaryBankType = "single_currency" | "multi_currency";

export type Beneficiary = {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  archivedAt: string | null;
};

export type BeneficiaryBank = {
  id: string;
  beneficiaryId: string;
  name: string;
  address: string;
  swiftCode: string;
  bankType: BeneficiaryBankType;
  archivedAt: string | null;
};

export type BeneficiaryAccount = {
  id: string;
  beneficiaryBankId: string;
  accountNumber: string;
  currencies: CurrencyCode[];
  archivedAt: string | null;
};
