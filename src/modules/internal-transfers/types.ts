import type { IsoDate, Money } from "@/modules/shared/types";

export type InternalTransferStatus = "pending" | "executed";

export type InternalTransfer = {
  id: string;
  fromInternalAccountId: string;
  toInternalAccountId: string;
  amountRub: Money;
  transferDate: IsoDate;
  status: InternalTransferStatus;
  payerId: string | null;
  note: string;
  createdByUserId: string | null;
  createdAt: string;
};
