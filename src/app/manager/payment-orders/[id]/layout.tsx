import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getPaymentOrder } from "@/modules/payment-orders/queries";

/**
 * Проверка существования заявки — до появления Suspense-границы в page.tsx.
 * Любая Suspense-граница выше (включая файл loading.tsx — поэтому его нет ни
 * тут, ни у списка на уровень выше) делает так, что notFound() ниже неё не
 * меняет код ответа (тот же эффект, что уже ловили на уровне разделов в шаге 03).
 */
export default async function PaymentOrderLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getPaymentOrder(id);
  if (!order) notFound();
  return children;
}
