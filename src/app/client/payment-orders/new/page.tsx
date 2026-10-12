import { PageHeader } from "@/components/custom/page-header";
import { requireClient } from "@/modules/auth/guards";
import { listBeneficiariesWithBanking } from "@/modules/beneficiaries/queries";
import { listConfirmedIncomingPaymentsForOrganization } from "@/modules/incoming-payments/queries";
import { messages } from "@/messages/ru";
import { NewPaymentOrderForm } from "./new-payment-order-form";

export default async function NewClientPaymentOrderPage() {
  await requireClient();
  const [beneficiaries, incomingPayments] = await Promise.all([
    listBeneficiariesWithBanking(),
    listConfirmedIncomingPaymentsForOrganization(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <PageHeader title={messages.paymentOrders.newTitle} />
      <NewPaymentOrderForm
        beneficiaries={beneficiaries}
        incomingPayments={incomingPayments}
      />
    </div>
  );
}
