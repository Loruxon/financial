import { PageHeader } from "@/components/custom/page-header";
import { messages } from "@/messages/ru";

export default async function OutgoingPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PageHeader title={`${messages.outgoingPayments.titleOne} ${id}`} />;
}
