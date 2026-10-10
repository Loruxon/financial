import { PageHeader } from "@/components/custom/page-header";
import { messages } from "@/messages/ru";

export default async function InternalTransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PageHeader title={`${messages.internalTransfers.titleOne} ${id}`} />;
}
