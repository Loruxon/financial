import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SectionLoadingSkeleton } from "@/components/custom/section-loading-skeleton";
import { listExecutionSchemesForAssignment } from "@/modules/execution-schemes/queries";
import { listIncomingPaymentsForPaymentOrder } from "@/modules/incoming-payments/queries";
import { listLedgerEntriesForPaymentOrder } from "@/modules/ledger/queries";
import { getOrganization } from "@/modules/organizations/queries";
import {
  getPaymentOrder,
  listPaymentOrderFiles,
  listPaymentOrderStatusChanges,
} from "@/modules/payment-orders/queries";
import {
  listManagersForAssignment,
  listUserNames,
} from "@/modules/users/queries";
import { getLatestExchangeRate } from "@/modules/exchange-rates/queries";
import type { PaymentOrder } from "@/modules/payment-orders/types";
import { PaymentOrderCard } from "./payment-order-card";

const CBR_CURRENCIES = new Set(["USD", "EUR", "CNY"]);

export default async function ManagerPaymentOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    // Локальная граница Suspense вместо loading.tsx — см. layout.tsx рядом.
    <Suspense fallback={<SectionLoadingSkeleton />}>
      <PaymentOrderCardData id={id} />
    </Suspense>
  );
}

async function PaymentOrderCardData({ id }: { id: string }) {
  // Существование уже проверено в layout.tsx — здесь просто читаем данные.
  const order = await getPaymentOrder(id);
  if (!order) notFound();
  const fullOrder = order as PaymentOrder;

  const [
    statusChanges,
    files,
    linkedIncomingPayments,
    ledgerEntries,
    managers,
    schemes,
    userNames,
    organization,
    cbrRate,
  ] = await Promise.all([
    listPaymentOrderStatusChanges(id),
    listPaymentOrderFiles(id),
    listIncomingPaymentsForPaymentOrder(id),
    listLedgerEntriesForPaymentOrder(id),
    listManagersForAssignment(),
    listExecutionSchemesForAssignment(),
    listUserNames(),
    getOrganization(fullOrder.organizationId),
    fullOrder.currency && CBR_CURRENCIES.has(fullOrder.currency)
      ? getLatestExchangeRate("cbr", fullOrder.currency)
      : Promise.resolve(undefined),
  ]);

  return (
    <PaymentOrderCard
      order={fullOrder}
      statusChanges={statusChanges}
      files={files}
      linkedIncomingPayments={linkedIncomingPayments}
      ledgerEntries={ledgerEntries}
      managers={managers}
      schemes={schemes}
      userNames={userNames}
      organizationName={organization?.name ?? ""}
      cbrRateHint={cbrRate?.rate ?? null}
    />
  );
}
