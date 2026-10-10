"use server";

import { z } from "zod";
import { createId, getStore, mockLatency } from "@/mocks/store";
import { requireClient } from "@/modules/auth/guards";
import type { ActionResult, CurrencyCode } from "@/modules/shared/types";
import type { Beneficiary, BeneficiaryAccount, BeneficiaryBank } from "./types";

const CURRENCIES = [
  "RUB",
  "USD",
  "EUR",
  "CNY",
  "KZT",
] as const satisfies readonly CurrencyCode[];

const createBeneficiarySchema = z.object({
  name: z.string().min(1, "Укажите название контрагента"),
  address: z.string().min(1, "Укажите адрес"),
  bankName: z.string().min(1, "Укажите название банка"),
  bankAddress: z.string().min(1, "Укажите адрес банка"),
  swiftCode: z.string().min(8, "SWIFT / BIC указан неверно"),
  accountNumber: z.string().min(1, "Укажите номер счёта"),
  currencies: z
    .array(z.enum(CURRENCIES))
    .min(1, "Выберите хотя бы одну валюту"),
});

export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;

export async function createBeneficiary(
  input: CreateBeneficiaryInput,
): Promise<
  ActionResult<{
    beneficiary: Beneficiary;
    bank: BeneficiaryBank;
    account: BeneficiaryAccount;
  }>
> {
  const parsed = createBeneficiarySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const user = await requireClient();
  await mockLatency();
  const store = getStore();

  const beneficiary: Beneficiary = {
    id: createId("beneficiary"),
    organizationId: user.organizationId!,
    name: parsed.data.name,
    address: parsed.data.address,
    archivedAt: null,
  };
  const bank: BeneficiaryBank = {
    id: createId("beneficiary_bank"),
    beneficiaryId: beneficiary.id,
    name: parsed.data.bankName,
    address: parsed.data.bankAddress,
    swiftCode: parsed.data.swiftCode,
    bankType:
      parsed.data.currencies.length > 1 ? "multi_currency" : "single_currency",
    archivedAt: null,
  };
  const account: BeneficiaryAccount = {
    id: createId("beneficiary_account"),
    beneficiaryBankId: bank.id,
    accountNumber: parsed.data.accountNumber,
    currencies: parsed.data.currencies,
    archivedAt: null,
  };

  store.beneficiaries.push(beneficiary);
  store.beneficiaryBanks.push(bank);
  store.beneficiaryAccounts.push(account);

  return { ok: true, data: { beneficiary, bank, account } };
}
