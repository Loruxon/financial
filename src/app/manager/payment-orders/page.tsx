import { Suspense } from "react";
import { PageHeader } from "@/components/custom/page-header";
import { SectionLoadingSkeleton } from "@/components/custom/section-loading-skeleton";
import { requireManager } from "@/modules/auth/guards";
import { listOrganizationsForAssignment } from "@/modules/organizations/queries";
import { listPaymentOrders } from "@/modules/payment-orders/queries";
import { listManagersForAssignment } from "@/modules/users/queries";
import { messages } from "@/messages/ru";
import type { PaymentOrder } from "@/modules/payment-orders/types";
import { PaymentOrdersList } from "./payment-orders-list";

export default function ManagerPaymentOrdersPage() {
  return (
    <>
      <PageHeader title={messages.paymentOrders.title} />
      {/*
        Локальная граница Suspense вместо файла loading.tsx: тот создаёт
        Suspense на уровне маршрута и ломает код ответа у notFound() в
        соседнем /manager/payment-orders/[id] (см. комментарий в его layout.tsx).
      */}
      <Suspense fallback={<SectionLoadingSkeleton />}>
        <PaymentOrdersListData />
      </Suspense>
    </>
  );
}

async function PaymentOrdersListData() {
  const [currentUser, orders, organizations, managers] = await Promise.all([
    requireManager("payment_orders"),
    listPaymentOrders(),
    listOrganizationsForAssignment(),
    listManagersForAssignment(),
  ]);

  // Эта страница — только для менеджеров (layout), поэтому всегда PaymentOrder[].
  return (
    <PaymentOrdersList
      orders={orders as PaymentOrder[]}
      organizations={organizations}
      managers={managers}
      currentUserId={currentUser.id}
    />
  );
}
