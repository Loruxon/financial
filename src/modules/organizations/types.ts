import type { Money } from "@/modules/shared/types";

export type ClientPricingMethod = "add_on" | "gross_up";

export type Organization = {
  id: string;
  name: string;
  clientFeePercent: string;
  clientSwiftFee: Money;
  clientPricingMethod: ClientPricingMethod;
};

export type Payer = {
  id: string;
  organizationId: string;
  name: string;
  inn: string;
  archivedAt: string | null;
};
