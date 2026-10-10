"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/components/custom/confirm-dialog";
import { CurrencySelect } from "@/components/custom/currency-select";
import { DataTable } from "@/components/custom/data-table";
import { DateField } from "@/components/custom/date-field";
import { DescriptionList } from "@/components/custom/description-list";
import { EmptyState } from "@/components/custom/empty-state";
import { EntityCombobox } from "@/components/custom/entity-combobox";
import { FileList } from "@/components/custom/file-list";
import { FileUpload } from "@/components/custom/file-upload";
import { FormSection } from "@/components/custom/form-section";
import { Money } from "@/components/custom/money";
import { MoneyInput } from "@/components/custom/money-input";
import { PageHeader } from "@/components/custom/page-header";
import { SectionCard } from "@/components/custom/section-card";
import { Stat } from "@/components/custom/stat";
import { StatusBadge } from "@/components/custom/status-badge";
import { StatusTimeline } from "@/components/custom/status-timeline";
import { messages } from "@/messages/ru";
import type { CurrencyCode, IsoDate } from "@/modules/shared/types";
import type {
  PaymentOrderFile,
  PaymentOrderStatus,
} from "@/modules/payment-orders/types";
import type { IncomingPaymentStatus } from "@/modules/incoming-payments/types";
import type { InternalTransferStatus } from "@/modules/internal-transfers/types";
import type { OutgoingPaymentStatus } from "@/modules/outgoing-payments/types";

const PAYMENT_ORDER_STATUSES: PaymentOrderStatus[] = [
  "submitted",
  "in_review",
  "sent_to_bank",
  "awaiting_closing_documents",
  "closing_documents_review",
  "closed",
  "needs_correction",
  "correction_review",
];
const INCOMING_PAYMENT_STATUSES: IncomingPaymentStatus[] = [
  "pending",
  "confirmed",
];
const INTERNAL_TRANSFER_STATUSES: InternalTransferStatus[] = [
  "pending",
  "executed",
];
const OUTGOING_PAYMENT_STATUSES: OutgoingPaymentStatus[] = [
  "new",
  "in_progress",
  "in_execution",
  "executed",
];

const SAMPLE_FILES: PaymentOrderFile[] = [
  {
    id: "f1",
    paymentOrderId: "po_1",
    section: "payment",
    fileType: "invoice",
    isUploadedByManager: false,
    originalName: "invoice-2026-0001.pdf",
    sizeBytes: 182_000,
    uploadedByUserId: "client.alfa",
    uploadedAt: "2026-10-01T09:15:00.000Z",
  },
  {
    id: "f2",
    paymentOrderId: "po_1",
    section: "bank",
    fileType: "swift_confirmation",
    isUploadedByManager: true,
    originalName: "swift-2026-0001.pdf",
    sizeBytes: 94_000,
    uploadedByUserId: "manager.full",
    uploadedAt: "2026-10-03T14:05:00.000Z",
  },
];

const SAMPLE_ENTITIES = [
  {
    value: "ben_1",
    label: "Huawei Technologies Co., Ltd.",
    description: "Shenzhen, China",
  },
  {
    value: "ben_2",
    label: "Mercedes-Benz AG",
    description: "Stuttgart, Germany",
  },
  {
    value: "ben_3",
    label: "Alibaba.com Hong Kong Ltd.",
    description: "Hong Kong",
  },
];

type DemoRow = {
  id: string;
  invoiceNumber: string;
  organization: string;
  amount: string;
  currency: CurrencyCode;
  status: PaymentOrderStatus;
};

const DEMO_ROWS: DemoRow[] = [
  {
    id: "1",
    invoiceNumber: "INV-2026-0001",
    organization: "ООО «Альфа Трейд»",
    amount: "128400.00",
    currency: "USD",
    status: "in_review",
  },
  {
    id: "2",
    invoiceNumber: "INV-2026-0002",
    organization: "ООО «Бета Импорт»",
    amount: "54200.50",
    currency: "EUR",
    status: "closed",
  },
  {
    id: "3",
    invoiceNumber: "INV-2026-0003",
    organization: "ООО «Гамма Логистик»",
    amount: "9800.00",
    currency: "CNY",
    status: "needs_correction",
  },
];

const DEMO_COLUMNS: ColumnDef<DemoRow, unknown>[] = [
  { accessorKey: "invoiceNumber", header: "Инвойс" },
  { accessorKey: "organization", header: "Организация" },
  {
    accessorKey: "amount",
    header: "Сумма",
    meta: { align: "right" },
    cell: ({ row }) => (
      <Money value={row.original.amount} currency={row.original.currency} />
    ),
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => (
      <StatusBadge entity="paymentOrders" status={row.original.status} />
    ),
  },
];

type DemoTableState = "data" | "loading" | "empty" | "error";

function DataTableDemo() {
  const [state, setState] = useState<DemoTableState>("data");

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={state}
        onValueChange={(value) => setState(value as DemoTableState)}
      >
        <TabsList>
          <TabsTrigger value="data">Данные</TabsTrigger>
          <TabsTrigger value="loading">Загрузка</TabsTrigger>
          <TabsTrigger value="empty">Пусто</TabsTrigger>
          <TabsTrigger value="error">Ошибка</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable
        columns={DEMO_COLUMNS}
        data={state === "data" ? DEMO_ROWS : []}
        isLoading={state === "loading"}
        error={
          state === "error"
            ? "Не удалось загрузить заявки. Попробуйте ещё раз."
            : undefined
        }
        emptyState={
          <EmptyState
            icon={Inbox}
            title={messages.paymentOrders.empty.noOrders}
            description="Измените фильтры или подождите новые заявки."
          />
        }
        exportFileName="demo-payment-orders"
      />
    </div>
  );
}

function ConfirmDialogDemo() {
  const confirm = useConfirm();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="destructive"
        onClick={async () => {
          const confirmed = await confirm({
            title: "Удалить контрагента?",
            description: "Это действие нельзя отменить.",
            variant: "destructive",
            confirmLabel: "Удалить",
          });
          setResult(confirmed ? "Подтверждено" : "Отменено");
        }}
      >
        Удалить контрагента
      </Button>
      {result ? (
        <span className="text-muted-foreground text-sm">{result}</span>
      ) : null}
    </div>
  );
}

function FormSectionDemo() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [touched, setTouched] = useState(false);
  const hasError = touched && invoiceNumber.trim() === "";

  return (
    <FormSection
      title="Платёж"
      description="Пример секции формы с ошибкой валидации."
      separator={false}
    >
      <Field data-invalid={hasError ? "true" : undefined}>
        <FieldLabel htmlFor="demo-invoice">
          {messages.paymentOrders.fields.invoiceNumber}
        </FieldLabel>
        <Input
          id="demo-invoice"
          value={invoiceNumber}
          aria-invalid={hasError}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {hasError ? <FieldError>Укажите номер счёта</FieldError> : null}
      </Field>
    </FormSection>
  );
}

function ComponentsShowcasePage() {
  const [money, setMoney] = useState("1234567.80");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [date, setDate] = useState<IsoDate | null>("2026-10-09");
  const [entity, setEntity] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <PageHeader
        title="Витрина компонентов"
        description="/dev/components — только не в production"
      />

      <SectionCard title="status-badge">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PAYMENT_ORDER_STATUSES.map((status) => (
              <StatusBadge
                key={status}
                entity="paymentOrders"
                status={status}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {INCOMING_PAYMENT_STATUSES.map((status) => (
              <StatusBadge
                key={status}
                entity="incomingPayments"
                status={status}
              />
            ))}
            {INTERNAL_TRANSFER_STATUSES.map((status) => (
              <StatusBadge
                key={status}
                entity="internalTransfers"
                status={status}
              />
            ))}
            {OUTGOING_PAYMENT_STATUSES.map((status) => (
              <StatusBadge
                key={status}
                entity="outgoingPayments"
                status={status}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="money, money-input, currency-select, date-field">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel>money</FieldLabel>
            <Money value="1234567.89" currency="USD" />
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-money-input">money-input</FieldLabel>
            <MoneyInput
              id="demo-money-input"
              value={money}
              onValueChange={setMoney}
              currencyLabel="₽"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-currency">currency-select</FieldLabel>
            <CurrencySelect
              id="demo-currency"
              value={currency}
              onValueChange={setCurrency}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-date">date-field</FieldLabel>
            <DateField id="demo-date" value={date} onValueChange={setDate} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="stat">
        <div className="grid grid-cols-3 gap-4">
          <Stat
            label="Свободный остаток"
            value={<Money value="2450000.00" />}
          />
          <Stat
            label="Заявок в работе"
            value="14"
            caption="из них 3 требуют действия"
          />
          <Stat label="Маржа за месяц" value={<Money value="318500.00" />} />
        </div>
      </SectionCard>

      <SectionCard title="description-list">
        <DescriptionList
          columns={2}
          items={[
            {
              label: messages.paymentOrders.fields.beneficiary,
              value: "Huawei Technologies Co., Ltd.",
            },
            {
              label: messages.beneficiaries.banks.fields.swiftCode,
              value: "PCBCCNBJ",
            },
            {
              label: messages.paymentOrders.fields.amount,
              value: <Money value="12500.00" currency="USD" />,
            },
            { label: "Пустое значение", value: null },
          ]}
        />
      </SectionCard>

      <SectionCard title="entity-combobox">
        <EntityCombobox
          options={SAMPLE_ENTITIES}
          value={entity}
          onValueChange={setEntity}
          placeholder="Выберите контрагента"
          onCreateNew={() =>
            alert("Открыли бы Sheet с формой нового контрагента")
          }
          createNewLabel={messages.beneficiaries.empty.createFirst}
        />
      </SectionCard>

      <SectionCard title="file-upload">
        <FileUpload
          documentTypes={[
            "invoice",
            "contract_request",
            "customs_declaration",
            "transport",
            "other",
          ]}
        />
      </SectionCard>

      <SectionCard title="file-list">
        <FileList
          files={SAMPLE_FILES}
          onDownload={(file) => alert(`Скачиваем ${file.originalName}`)}
        />
      </SectionCard>

      <SectionCard title="status-timeline">
        <StatusTimeline
          items={[
            {
              id: "1",
              statusLabel: messages.paymentOrders.status.submitted,
              actorName: "Ирина Волкова",
              changedAt: "2026-09-28T09:00:00.000Z",
            },
            {
              id: "2",
              statusLabel: messages.paymentOrders.status.in_review,
              actorName: "Светлана Орлова",
              changedAt: "2026-09-29T11:30:00.000Z",
            },
            {
              id: "3",
              statusLabel: messages.paymentOrders.status.needs_correction,
              actorName: "Светлана Орлова",
              changedAt: "2026-09-30T16:12:00.000Z",
              comment: "Проверьте реквизиты получателя",
            },
          ]}
        />
      </SectionCard>

      <SectionCard title="empty-state">
        <EmptyState
          icon={FileText}
          title={messages.beneficiaries.empty.noBeneficiaries}
          description="Нажмите кнопку ниже, чтобы добавить первого."
          action={<Button>{messages.beneficiaries.empty.createFirst}</Button>}
        />
      </SectionCard>

      <SectionCard title="confirm-dialog / useConfirm()">
        <ConfirmDialogDemo />
      </SectionCard>

      <SectionCard title="form-section (с ошибкой валидации)">
        <FormSectionDemo />
      </SectionCard>

      <SectionCard title="data-table">
        <DataTableDemo />
      </SectionCard>
    </div>
  );
}

export default function DevComponentsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <ComponentsShowcasePage />;
}
