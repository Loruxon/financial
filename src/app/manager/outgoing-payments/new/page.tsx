import { PageHeader } from "@/components/custom/page-header";
import { messages } from "@/messages/ru";

export default function NewOutgoingPaymentPage() {
  return <PageHeader title={messages.outgoingPayments.newTitle} />;
}
