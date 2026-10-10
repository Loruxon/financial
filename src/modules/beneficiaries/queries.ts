import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import { getCurrentUser } from "@/modules/auth/session";
import type { Beneficiary } from "./types";

async function organizationScope(organizationId?: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизован");
  if (user.kind === "client") return user.organizationId!;
  await requireManager("reference_data");
  if (!organizationId) throw new Error("Укажите организацию");
  return organizationId;
}

export async function listBeneficiaries(
  organizationId?: string,
): Promise<Beneficiary[]> {
  const scope = await organizationScope(organizationId);
  await mockLatency();
  return getStore().beneficiaries.filter(
    (b) => b.organizationId === scope && !b.archivedAt,
  );
}

export async function getBeneficiary(
  id: string,
): Promise<Beneficiary | undefined> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизован");
  await mockLatency();
  const beneficiary = getStore().beneficiaries.find((b) => b.id === id);
  if (!beneficiary) return undefined;
  if (
    user.kind === "client" &&
    beneficiary.organizationId !== user.organizationId
  ) {
    return undefined;
  }
  if (user.kind === "manager") {
    await requireManager("reference_data");
  }
  return beneficiary;
}

export async function getBeneficiaryBankAndAccounts(beneficiaryId: string) {
  await mockLatency();
  const store = getStore();
  const banks = store.beneficiaryBanks.filter(
    (b) => b.beneficiaryId === beneficiaryId,
  );
  const accounts = store.beneficiaryAccounts.filter((a) =>
    banks.some((b) => b.id === a.beneficiaryBankId),
  );
  return { banks, accounts };
}

/** Контрагенты организации с их банком и счётом — для формы новой заявки. */
export async function listBeneficiariesWithBanking(organizationId?: string) {
  const beneficiaries = await listBeneficiaries(organizationId);
  const store = getStore();
  return beneficiaries.map((beneficiary) => {
    const bank = store.beneficiaryBanks.find(
      (b) => b.beneficiaryId === beneficiary.id,
    );
    const account = bank
      ? store.beneficiaryAccounts.find((a) => a.beneficiaryBankId === bank.id)
      : undefined;
    return { beneficiary, bank, account };
  });
}
