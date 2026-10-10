"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Inbox, Search } from "lucide-react";
import { DataTable } from "@/components/custom/data-table";
import { EmptyState } from "@/components/custom/empty-state";
import { Money } from "@/components/custom/money";
import { StatusBadge } from "@/components/custom/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { messages } from "@/messages/ru";
import type { Organization } from "@/modules/organizations/types";
import {
  getPaymentOrderNumber,
  type PaymentOrder,
} from "@/modules/payment-orders/types";
import type { User } from "@/modules/users/types";

type PaymentOrdersListProps = {
  orders: PaymentOrder[];
  organizations: Organization[];
  managers: User[];
  currentUserId: string;
};

const TAB_BUCKETS = {
  action: new Set([
    "submitted",
    "in_review",
    "closing_documents_review",
    "correction_review",
  ]),
  in_progress: new Set([
    "sent_to_bank",
    "awaiting_closing_documents",
    "needs_correction",
  ]),
  closed: new Set(["closed"]),
  all: null,
} as const;

type TabValue = keyof typeof TAB_BUCKETS;

const TAB_LABELS: Record<TabValue, string> = {
  action: messages.paymentOrders.tabs.action,
  in_progress: messages.paymentOrders.tabs.inProgress,
  closed: messages.paymentOrders.tabs.closed,
  all: messages.paymentOrders.tabs.all,
};

export function PaymentOrdersList({
  orders,
  organizations,
  managers,
  currentUserId,
}: PaymentOrdersListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = (searchParams.get("tab") as TabValue | null) ?? "action";
  const organizationId = searchParams.get("org") ?? "all";
  const assignee = searchParams.get("assignee") ?? "all";
  const currency = searchParams.get("currency") ?? "all";
  const search = searchParams.get("q") ?? "";

  const organizationName = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );
  const managerName = useMemo(
    () => new Map(managers.map((m) => [m.id, m.name])),
    [managers],
  );

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null || value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const tabCounts = useMemo(() => {
    const counts: Record<TabValue, number> = {
      action: 0,
      in_progress: 0,
      closed: 0,
      all: orders.length,
    };
    for (const order of orders) {
      if (TAB_BUCKETS.action.has(order.status)) counts.action++;
      else if (TAB_BUCKETS.in_progress.has(order.status)) counts.in_progress++;
      else if (TAB_BUCKETS.closed.has(order.status)) counts.closed++;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const bucket = TAB_BUCKETS[tab];
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (bucket && !bucket.has(order.status)) return false;
      if (organizationId !== "all" && order.organizationId !== organizationId)
        return false;
      if (assignee === "mine" && order.assigneeUserId !== currentUserId)
        return false;
      if (currency !== "all" && order.currency !== currency) return false;
      if (query) {
        const haystack =
          `${order.invoiceNumber} ${order.beneficiaryName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [orders, tab, organizationId, assignee, currency, search, currentUserId]);

  const columns: ColumnDef<PaymentOrder, unknown>[] = useMemo(
    () => [
      {
        id: "number",
        header: "№",
        accessorFn: (order) => getPaymentOrderNumber(order.id),
      },
      {
        id: "submittedAt",
        header: messages.paymentOrders.fields.submittedAt,
        accessorFn: (order) => order.submittedAt ?? order.createdAt,
        cell: ({ getValue }) =>
          formatDate((getValue<string>() ?? "").slice(0, 10)),
      },
      {
        id: "organization",
        header: messages.paymentOrders.fields.organization,
        accessorFn: (order) =>
          organizationName.get(order.organizationId) ?? order.organizationId,
      },
      {
        accessorKey: "beneficiaryName",
        header: messages.paymentOrders.fields.beneficiary,
      },
      {
        accessorKey: "invoiceNumber",
        header: messages.paymentOrders.fields.invoiceNumber,
      },
      {
        id: "amount",
        header: messages.paymentOrders.fields.amount,
        accessorFn: (order) => order.amount ?? "",
        meta: { align: "right" },
        cell: ({ row }) =>
          row.original.amount ? (
            <Money
              value={row.original.amount}
              currency={row.original.currency ?? "RUB"}
            />
          ) : (
            "—"
          ),
      },
      {
        id: "fundingAmountRub",
        header: `${messages.paymentOrders.fields.fundingAmountRub}, ₽`,
        accessorFn: (order) => order.fundingAmountRub ?? "",
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return value ? <Money value={value} /> : "—";
        },
      },
      {
        accessorKey: "status",
        header: messages.paymentOrders.fields.status,
        cell: ({ row }) => (
          <StatusBadge entity="paymentOrders" status={row.original.status} />
        ),
      },
      {
        id: "assignee",
        header: messages.paymentOrders.fields.assignee,
        accessorFn: (order) =>
          order.assigneeUserId
            ? (managerName.get(order.assigneeUserId) ?? "—")
            : "—",
      },
      {
        id: "margin",
        header: `${messages.paymentOrders.fields.marginRub}, ₽`,
        accessorFn: (order) => order.marginRub ?? "",
        meta: { align: "right" },
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return value ? <Money value={value} /> : "—";
        },
      },
    ],
    [organizationName, managerName],
  );

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setParam("tab", value === "action" ? null : value)
        }
      >
        <TabsList>
          {(Object.keys(TAB_LABELS) as TabValue[]).map((value) => (
            <TabsTrigger key={value} value={value}>
              {TAB_LABELS[value]} ({tabCounts[value]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder={messages.paymentOrders.searchPlaceholder}
            defaultValue={search}
            className="w-64 pl-8"
            onChange={(e) => setParam("q", e.target.value)}
          />
        </div>
        <Select
          items={[
            {
              value: "all",
              label: messages.paymentOrders.filters.allOrganizations,
            },
            ...organizations.map((org) => ({ value: org.id, label: org.name })),
          ]}
          value={organizationId}
          onValueChange={(value) => setParam("org", value)}
        >
          <SelectTrigger className="w-56">
            <SelectValue
              placeholder={messages.paymentOrders.fields.beneficiary}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {messages.paymentOrders.filters.allOrganizations}
            </SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "all", label: messages.paymentOrders.filters.anyAssignee },
            { value: "mine", label: messages.paymentOrders.filters.mine },
          ]}
          value={assignee}
          onValueChange={(value) => setParam("assignee", value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {messages.paymentOrders.filters.anyAssignee}
            </SelectItem>
            <SelectItem value="mine">
              {messages.paymentOrders.filters.mine}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select
          items={[
            {
              value: "all",
              label: messages.paymentOrders.filters.allCurrencies,
            },
            { value: "USD", label: "USD" },
            { value: "EUR", label: "EUR" },
            { value: "CNY", label: "CNY" },
          ]}
          value={currency}
          onValueChange={(value) => setParam("currency", value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {messages.paymentOrders.filters.allCurrencies}
            </SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="CNY">CNY</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        onRowClick={(order) =>
          router.push(`/manager/payment-orders/${order.id}`)
        }
        exportFileName="payment-orders"
        emptyState={
          <EmptyState
            icon={Inbox}
            title={messages.paymentOrders.empty.noOrders}
            description={messages.paymentOrders.empty.noOrdersDescription}
          />
        }
      />
    </div>
  );
}
