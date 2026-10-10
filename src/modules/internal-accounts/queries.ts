import { getStore, mockLatency } from "@/mocks/store";
import { requireManager } from "@/modules/auth/guards";
import { getInternalAccountBalance } from "@/modules/ledger/queries";
import type { InternalAccount } from "./types";

/** Внутренние счета клиентам не показываются никогда (раздел 6 target-design.md). */
export async function listInternalAccounts(): Promise<InternalAccount[]> {
  await requireManager("internal_account_balances");
  await mockLatency();
  return getStore().internalAccounts;
}

export async function listInternalAccountBalances() {
  const accounts = await listInternalAccounts();
  return accounts.map((account) => ({
    account,
    balance: getInternalAccountBalance(account.id),
  }));
}
