import { Badge } from "@/components/ui/badge";
import { messages } from "@/messages/ru";
import type { PaymentOrderStatus } from "@/modules/payment-orders/types";
import type { IncomingPaymentStatus } from "@/modules/incoming-payments/types";
import type { InternalTransferStatus } from "@/modules/internal-transfers/types";
import type { OutgoingPaymentStatus } from "@/modules/outgoing-payments/types";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const PAYMENT_ORDER_VARIANTS: Record<PaymentOrderStatus, BadgeVariant> = {
  submitted: "outline",
  in_review: "secondary",
  sent_to_bank: "secondary",
  awaiting_closing_documents: "outline",
  closing_documents_review: "outline",
  closed: "default",
  needs_correction: "destructive",
  correction_review: "outline",
};

const INCOMING_PAYMENT_VARIANTS: Record<IncomingPaymentStatus, BadgeVariant> = {
  pending: "outline",
  confirmed: "default",
};

const INTERNAL_TRANSFER_VARIANTS: Record<InternalTransferStatus, BadgeVariant> =
  {
    pending: "outline",
    executed: "default",
  };

const OUTGOING_PAYMENT_VARIANTS: Record<OutgoingPaymentStatus, BadgeVariant> = {
  new: "outline",
  in_progress: "secondary",
  in_execution: "secondary",
  executed: "default",
};

type StatusBadgeProps =
  | { entity: "paymentOrders"; status: PaymentOrderStatus }
  | { entity: "incomingPayments"; status: IncomingPaymentStatus }
  | { entity: "internalTransfers"; status: InternalTransferStatus }
  | { entity: "outgoingPayments"; status: OutgoingPaymentStatus };

/**
 * Статус сущности как стандартный `Badge` без своих цветов: финальные статусы —
 * `default`, требующие действия — `outline`, в работе — `secondary`,
 * `needs_correction` — `destructive`.
 *
 * @example
 * <StatusBadge entity="paymentOrders" status="in_review" />
 */
export function StatusBadge(props: StatusBadgeProps) {
  switch (props.entity) {
    case "paymentOrders":
      return (
        <Badge variant={PAYMENT_ORDER_VARIANTS[props.status]}>
          {messages.paymentOrders.status[props.status]}
        </Badge>
      );
    case "incomingPayments":
      return (
        <Badge variant={INCOMING_PAYMENT_VARIANTS[props.status]}>
          {messages.incomingPayments.status[props.status]}
        </Badge>
      );
    case "internalTransfers":
      return (
        <Badge variant={INTERNAL_TRANSFER_VARIANTS[props.status]}>
          {messages.internalTransfers.status[props.status]}
        </Badge>
      );
    case "outgoingPayments":
      return (
        <Badge variant={OUTGOING_PAYMENT_VARIANTS[props.status]}>
          {messages.outgoingPayments.status[props.status]}
        </Badge>
      );
  }
}
