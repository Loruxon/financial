"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DateField } from "@/components/custom/date-field";
import { DescriptionList } from "@/components/custom/description-list";
import { EntityCombobox } from "@/components/custom/entity-combobox";
import { FileList } from "@/components/custom/file-list";
import { FileUpload } from "@/components/custom/file-upload";
import { Money } from "@/components/custom/money";
import { PageHeader } from "@/components/custom/page-header";
import { SectionCard } from "@/components/custom/section-card";
import { StatusBadge } from "@/components/custom/status-badge";
import { StatusTimeline } from "@/components/custom/status-timeline";
import { useBreadcrumbLabel } from "@/components/custom/breadcrumbs";
import { useConfirm } from "@/components/custom/confirm-dialog";
import { formatAccountNumber, formatDate, formatInn } from "@/lib/format";
import { messages } from "@/messages/ru";
import {
  addPaymentOrderFile,
  calculateClientCharge,
  calculateCost,
  changePaymentOrderStatus,
  requestPaymentOrderCorrection,
  updatePaymentOrderAssignment,
  updatePaymentOrderNote,
  updatePaymentOrderVisibility,
} from "@/modules/payment-orders/actions";
import { getAllowedNextStatuses } from "@/modules/payment-orders/status-transitions";
import {
  getPaymentOrderNumber,
  type PaymentOrder,
  type PaymentOrderStatus,
} from "@/modules/payment-orders/types";
import type { IncomingPayment } from "@/modules/incoming-payments/types";
import type { ExecutionScheme } from "@/modules/execution-schemes/types";
import type { User } from "@/modules/users/types";
import type { LedgerEntry, LedgerTransaction } from "@/modules/ledger/types";
import type {
  PaymentOrderFile,
  PaymentOrderFileType,
  PaymentOrderStatusChange,
} from "@/modules/payment-orders/types";

type LedgerRow = {
  entry: LedgerEntry;
  transaction: LedgerTransaction | undefined;
};

type PaymentOrderCardProps = {
  order: PaymentOrder;
  statusChanges: PaymentOrderStatusChange[];
  files: PaymentOrderFile[];
  linkedIncomingPayments: IncomingPayment[];
  ledgerEntries: LedgerRow[];
  managers: User[];
  schemes: ExecutionScheme[];
  userNames: { id: string; name: string; kind: string }[];
  organizationName: string;
  cbrRateHint: string | null;
};

const DOCUMENT_TYPES: PaymentOrderFileType[] = [
  "invoice",
  "contract_request",
  "customs_declaration",
  "transport",
  "swift_confirmation",
  "order_form",
  "other",
];

export function PaymentOrderCard(props: PaymentOrderCardProps) {
  const { order, organizationName, userNames } = props;
  const router = useRouter();
  const userName = (id: string | null) =>
    id ? (userNames.find((u) => u.id === id)?.name ?? id) : null;
  const title = `${messages.paymentOrders.titleOne} № ${getPaymentOrderNumber(order.id)}`;
  useBreadcrumbLabel(title);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        meta={
          <>
            <StatusBadge entity="paymentOrders" status={order.status} />
            <span>{organizationName}</span>
            {order.submittedAt ? (
              <span>{formatDate(order.submittedAt.slice(0, 10))}</span>
            ) : null}
          </>
        }
        actions={
          <TransitionActions order={order} onChanged={() => router.refresh()} />
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <SectionCard title={messages.paymentOrders.sections.payment}>
            <DescriptionList
              columns={2}
              items={[
                {
                  label: messages.paymentOrders.fields.invoiceNumber,
                  value: order.invoiceNumber,
                },
                {
                  label: messages.paymentOrders.fields.amount,
                  value: order.amount ? (
                    <Money
                      value={order.amount}
                      currency={order.currency ?? "RUB"}
                    />
                  ) : null,
                },
                {
                  label: messages.paymentOrders.fields.paymentDetails,
                  value: order.paymentDetails,
                },
              ]}
            />
          </SectionCard>

          <SectionCard
            title={messages.paymentOrders.sections.beneficiaryAndBank}
          >
            <DescriptionList
              columns={2}
              items={[
                {
                  label: messages.paymentOrders.fields.beneficiary,
                  value: order.beneficiaryName,
                },
                {
                  label: messages.beneficiaries.fields.address,
                  value: order.beneficiaryAddress,
                },
                {
                  label: messages.paymentOrders.fields.beneficiaryBank,
                  value: order.beneficiaryBankName,
                },
                {
                  label: messages.beneficiaries.banks.fields.address,
                  value: order.beneficiaryBankAddress,
                },
                {
                  label: messages.beneficiaries.banks.fields.swiftCode,
                  value: order.beneficiarySwiftCode,
                },
                {
                  label: messages.paymentOrders.fields.beneficiaryAccount,
                  value: order.beneficiaryAccountNumber
                    ? formatAccountNumber(order.beneficiaryAccountNumber)
                    : null,
                },
              ]}
            />
          </SectionCard>

          <SectionCard title={messages.paymentOrders.sections.funding}>
            <DescriptionList
              columns={2}
              items={[
                {
                  label: messages.paymentOrders.fields.payer,
                  value: order.payerName,
                },
                {
                  label: messages.payers.fields.inn,
                  value: order.payerInn ? formatInn(order.payerInn) : null,
                },
                {
                  label: messages.paymentOrders.fields.internalAccount,
                  value: order.internalAccountName,
                },
                {
                  label: messages.paymentOrders.fields.fundingAmountRub,
                  value: order.fundingAmountRub ? (
                    <Money value={order.fundingAmountRub} />
                  ) : null,
                },
                {
                  label: messages.paymentOrders.fields.fundingDate,
                  value: order.fundingDate
                    ? formatDate(order.fundingDate)
                    : null,
                },
              ]}
            />
            {props.linkedIncomingPayments.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm">
                  {messages.paymentOrders.linkedIncomingPayments}
                </span>
                <ul className="flex flex-col gap-2">
                  {props.linkedIncomingPayments.map((payment) => (
                    <li key={payment.id} className="text-sm">
                      <Link
                        href="/manager/incoming-payments"
                        className="underline underline-offset-4"
                      >
                        {formatDate(payment.paymentDate)} —{" "}
                        <Money value={payment.amountRub} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </SectionCard>

          <DocumentsCard
            order={order}
            files={props.files}
            onChanged={() => router.refresh()}
          />

          <VisibilityCard order={order} />

          <ManagerNoteCard order={order} />
        </div>

        <div className="flex flex-col gap-6">
          <AssignmentCard
            order={order}
            managers={props.managers}
            schemes={props.schemes}
          />
          <ClientChargeCard
            order={order}
            cbrRateHint={props.cbrRateHint}
            onChanged={() => router.refresh()}
          />
          <CostCard order={order} onChanged={() => router.refresh()} />
          <SectionCard title={messages.paymentOrders.sections.statusHistory}>
            <StatusTimeline
              items={props.statusChanges.map((change) => ({
                id: change.id,
                statusLabel: messages.paymentOrders.status[change.toStatus],
                actorName: userName(change.changedByUserId),
                changedAt: change.changedAt,
                comment: change.comment || undefined,
              }))}
            />
          </SectionCard>
          <SectionCard
            title={messages.paymentOrders.sections.ledgerEntries}
            actions={
              <Link
                href="/manager/ledger"
                className="text-sm underline underline-offset-4"
              >
                {messages.ledger.title}
              </Link>
            }
          >
            {props.ledgerEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {messages.paymentOrders.noLedgerEntries}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {props.ledgerEntries
                  .slice(0, 5)
                  .map(({ entry, transaction }) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {transaction
                          ? messages.ledger.transactionType[
                              transaction.transactionType
                            ]
                          : "—"}
                      </span>
                      <Money value={entry.amountRub} />
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function TransitionActions({
  order,
  onChanged,
}: {
  order: PaymentOrder;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const confirm = useConfirm();
  const allowed = getAllowedNextStatuses(order.status, "manager");

  function runTransition(toStatus: PaymentOrderStatus) {
    startTransition(async () => {
      if (toStatus === "closed") {
        const confirmed = await confirm({
          title: messages.paymentOrders.closeConfirm.title,
          description: messages.paymentOrders.closeConfirm.description,
          confirmLabel: messages.paymentOrders.actions.close,
        });
        if (!confirmed) return;
      }
      const result = await changePaymentOrderStatus({
        paymentOrderId: order.id,
        toStatus,
      });
      if (result.ok) {
        toast.success(messages.paymentOrders.statusUpdated);
        onChanged();
      } else {
        toast.error(result.error);
      }
    });
  }

  const TRANSITION_LABELS: Partial<Record<PaymentOrderStatus, string>> = {
    in_review: messages.paymentOrders.actions.startReview,
    sent_to_bank: messages.paymentOrders.actions.sendToBank,
    closed: messages.paymentOrders.actions.close,
    needs_correction: messages.paymentOrders.actions.requestCorrection,
  };

  return (
    <>
      {allowed.map((status, index) => {
        if (status === "needs_correction") {
          return (
            <Button
              key={status}
              variant="outline"
              disabled={isPending}
              onClick={() => setCorrectionOpen(true)}
            >
              {TRANSITION_LABELS[status]}
            </Button>
          );
        }
        return (
          <Button
            key={status}
            variant={index === 0 ? "default" : "outline"}
            disabled={isPending}
            onClick={() => runTransition(status)}
          >
            {TRANSITION_LABELS[status] ?? status}
          </Button>
        );
      })}
      <CorrectionDialog
        order={order}
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        onChanged={onChanged}
      />
    </>
  );
}

function CorrectionDialog({
  order,
  open,
  onOpenChange,
  onChanged,
}: {
  order: PaymentOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [comment, setComment] = useState("");
  const [editPayment, setEditPayment] = useState(false);
  const [editPayer, setEditPayer] = useState(false);
  const [editDocuments, setEditDocuments] = useState(false);
  const [editClosingDocuments, setEditClosingDocuments] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await requestPaymentOrderCorrection({
        paymentOrderId: order.id,
        comment,
        canClientEditPayment: editPayment,
        canClientEditPayer: editPayer,
        canClientEditDocuments: editDocuments,
        canClientEditClosingDocuments: editClosingDocuments,
      });
      if (result.ok) {
        toast.success(messages.paymentOrders.correctionRequested);
        onOpenChange(false);
        setComment("");
        onChanged();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {messages.paymentOrders.actions.requestCorrection}
          </DialogTitle>
          <DialogDescription>
            {messages.paymentOrders.correctionDialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editPayment}
                onCheckedChange={(v) => setEditPayment(!!v)}
              />
              {messages.paymentOrders.correctionFields.amount}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editPayer}
                onCheckedChange={(v) => setEditPayer(!!v)}
              />
              {messages.paymentOrders.fields.payer}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editDocuments}
                onCheckedChange={(v) => setEditDocuments(!!v)}
              />
              {messages.paymentOrders.sections.documents}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editClosingDocuments}
                onCheckedChange={(v) => setEditClosingDocuments(!!v)}
              />
              {messages.paymentOrders.fileSection.closing}
            </label>
          </div>
          <Field>
            <FieldLabel htmlFor="correction-comment">
              {messages.ledger.fields.comment}
            </FieldLabel>
            <Textarea
              id="correction-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {messages.common.actions.cancel}
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || comment.trim() === ""}
          >
            {messages.paymentOrders.actions.requestCorrection}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentCard({
  order,
  managers,
  schemes,
}: {
  order: PaymentOrder;
  managers: User[];
  schemes: ExecutionScheme[];
}) {
  const [assigneeUserId, setAssigneeUserId] = useState(order.assigneeUserId);
  const [executionSchemeId, setExecutionSchemeId] = useState(
    order.executionSchemeId,
  );
  const [isPending, startTransition] = useTransition();

  function save(next: {
    assigneeUserId: string | null;
    executionSchemeId: string | null;
  }) {
    startTransition(async () => {
      const result = await updatePaymentOrderAssignment({
        paymentOrderId: order.id,
        ...next,
      });
      if (result.ok) toast.success(messages.common.saved);
      else toast.error(result.error);
    });
  }

  return (
    <SectionCard title={messages.paymentOrders.sections.assignment}>
      <Field>
        <FieldLabel>{messages.paymentOrders.fields.assignee}</FieldLabel>
        <EntityCombobox
          options={managers.map((m) => ({ value: m.id, label: m.name }))}
          value={assigneeUserId}
          disabled={isPending}
          onValueChange={(value) => {
            setAssigneeUserId(value);
            save({ assigneeUserId: value, executionSchemeId });
          }}
        />
      </Field>
      <Field>
        <FieldLabel>{messages.paymentOrders.fields.executionScheme}</FieldLabel>
        <Select
          items={schemes.map((scheme) => ({
            value: scheme.id,
            label: scheme.name,
          }))}
          value={executionSchemeId ?? undefined}
          disabled={isPending}
          onValueChange={(value) => {
            setExecutionSchemeId(value);
            save({ assigneeUserId, executionSchemeId: value });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={messages.executionSchemes.fields.name} />
          </SelectTrigger>
          <SelectContent>
            {schemes.map((scheme) => (
              <SelectItem key={scheme.id} value={scheme.id}>
                {scheme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </SectionCard>
  );
}

function ClientChargeCard({
  order,
  cbrRateHint,
  onChanged,
}: {
  order: PaymentOrder;
  cbrRateHint: string | null;
  onChanged: () => void;
}) {
  const [executionDate, setExecutionDate] = useState(order.executionDate);
  const [rate, setRate] = useState(
    order.clientExchangeRate ?? cbrRateHint ?? "",
  );
  const [isPending, startTransition] = useTransition();

  function calculate() {
    if (!executionDate || !rate) {
      toast.error(
        messages.paymentOrders.validation.executionDateAndRateRequired,
      );
      return;
    }
    startTransition(async () => {
      const result = await calculateClientCharge({
        paymentOrderId: order.id,
        executionDate,
        clientExchangeRate: rate,
      });
      if (result.ok) {
        toast.success(messages.paymentOrders.clientChargeCalculated);
        onChanged();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <SectionCard title={messages.paymentOrders.sections.clientCharge}>
      <Field>
        <FieldLabel>{messages.paymentOrders.fields.executionDate}</FieldLabel>
        <DateField value={executionDate} onValueChange={setExecutionDate} />
      </Field>
      <Field>
        <FieldLabel>
          {messages.paymentOrders.fields.clientExchangeRate}
        </FieldLabel>
        <Input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          inputMode="decimal"
        />
        {cbrRateHint ? (
          <p className="text-muted-foreground text-sm">
            {messages.exchangeRates.cbrRateLabel}: {cbrRateHint}
          </p>
        ) : null}
      </Field>
      <Button variant="outline" onClick={calculate} disabled={isPending}>
        {messages.common.actions.calculate}
      </Button>
      {order.clientChargeRub ? (
        <DescriptionList
          columns={2}
          items={[
            {
              label: messages.paymentOrders.fields.clientChargeRub,
              value: <Money value={order.clientChargeRub} />,
            },
            {
              label: messages.paymentOrders.fields.clientRemainderRub,
              value: order.clientRemainderRub ? (
                <Money value={order.clientRemainderRub} />
              ) : null,
            },
          ]}
        />
      ) : null}
    </SectionCard>
  );
}

function CostCard({
  order,
  onChanged,
}: {
  order: PaymentOrder;
  onChanged: () => void;
}) {
  const [costExecutionDate, setCostExecutionDate] = useState(
    order.costExecutionDate,
  );
  const [costExchangeRate, setCostExchangeRate] = useState(
    order.costExchangeRate ?? order.clientExchangeRate ?? "",
  );
  const [costMarkupPercent, setCostMarkupPercent] = useState(
    order.costMarkupPercent ?? "0.2",
  );
  const [isPending, startTransition] = useTransition();

  function calculate() {
    if (!costExecutionDate || !costExchangeRate || !costMarkupPercent) {
      toast.error(messages.paymentOrders.validation.costFieldsRequired);
      return;
    }
    startTransition(async () => {
      const result = await calculateCost({
        paymentOrderId: order.id,
        costExecutionDate,
        costExchangeRate,
        costMarkupPercent,
      });
      if (result.ok) {
        toast.success(messages.paymentOrders.costCalculated);
        onChanged();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <SectionCard title={messages.paymentOrders.fields.costAmountRub}>
      <Field>
        <FieldLabel>{messages.paymentOrders.fields.executionDate}</FieldLabel>
        <DateField
          value={costExecutionDate}
          onValueChange={setCostExecutionDate}
        />
      </Field>
      <Field>
        <FieldLabel>
          {messages.paymentOrders.fields.clientExchangeRate}
        </FieldLabel>
        <Input
          value={costExchangeRate}
          onChange={(e) => setCostExchangeRate(e.target.value)}
          inputMode="decimal"
        />
      </Field>
      <Field>
        <FieldLabel>
          {messages.paymentOrders.fields.costMarkupPercent}
        </FieldLabel>
        <Input
          value={costMarkupPercent}
          onChange={(e) => setCostMarkupPercent(e.target.value)}
          inputMode="decimal"
        />
      </Field>
      <Button variant="outline" onClick={calculate} disabled={isPending}>
        {messages.common.actions.calculate}
      </Button>
      {order.costAmountRub ? (
        <DescriptionList
          columns={2}
          items={[
            {
              label: messages.paymentOrders.fields.costAmountRub,
              value: <Money value={order.costAmountRub} />,
            },
            {
              label: messages.paymentOrders.fields.marginRub,
              value: order.marginRub ? <Money value={order.marginRub} /> : null,
            },
            {
              label: messages.paymentOrders.fields.isMinFeeApplied,
              value: order.isMinFeeApplied
                ? messages.common.yes
                : messages.common.no,
            },
          ]}
        />
      ) : null}
    </SectionCard>
  );
}

function DocumentsCard({
  order,
  files,
  onChanged,
}: {
  order: PaymentOrder;
  files: PaymentOrderFile[];
  onChanged: () => void;
}) {
  const sections = [
    { value: "payment", label: messages.paymentOrders.fileSection.payment },
    { value: "closing", label: messages.paymentOrders.fileSection.closing },
    { value: "bank", label: messages.paymentOrders.fileSection.bank },
  ] as const;

  async function handleUpload(
    section: "payment" | "closing" | "bank",
    entries: { file: File; fileType: PaymentOrderFileType }[],
  ) {
    for (const entry of entries) {
      const result = await addPaymentOrderFile({
        paymentOrderId: order.id,
        section,
        fileType: entry.fileType,
        originalName: entry.file.name,
        sizeBytes: entry.file.size,
      });
      if (!result.ok) toast.error(result.error);
    }
    if (entries.length > 0) {
      toast.success(messages.fileUpload.uploaded);
      onChanged();
    }
  }

  return (
    <SectionCard title={messages.paymentOrders.sections.documents}>
      <Tabs defaultValue="payment">
        <TabsList>
          {sections.map((section) => (
            <TabsTrigger key={section.value} value={section.value}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((section) => (
          <TabsContent
            key={section.value}
            value={section.value}
            className="flex flex-col gap-4"
          >
            <FileList
              files={files.filter((f) => f.section === section.value)}
            />
            <FileUpload
              documentTypes={DOCUMENT_TYPES}
              onFilesChange={(entries) => handleUpload(section.value, entries)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </SectionCard>
  );
}

function VisibilityCard({ order }: { order: PaymentOrder }) {
  const [swift, setSwift] = useState(order.isSwiftVisibleToClient);
  const [orderForm, setOrderForm] = useState(order.isOrderFormVisibleToClient);
  const [execution, setExecution] = useState(order.isExecutionVisibleToClient);
  const [isPending, startTransition] = useTransition();

  function save(next: {
    isSwiftVisibleToClient: boolean;
    isOrderFormVisibleToClient: boolean;
    isExecutionVisibleToClient: boolean;
  }) {
    startTransition(async () => {
      const result = await updatePaymentOrderVisibility({
        paymentOrderId: order.id,
        ...next,
      });
      if (result.ok) toast.success(messages.common.saved);
      else toast.error(result.error);
    });
  }

  return (
    <SectionCard title={messages.paymentOrders.sections.clientVisibility}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">
          {messages.paymentOrders.visibilityFields.swift}
        </span>
        <Switch
          checked={swift}
          disabled={isPending}
          onCheckedChange={(checked) => {
            setSwift(checked);
            save({
              isSwiftVisibleToClient: checked,
              isOrderFormVisibleToClient: orderForm,
              isExecutionVisibleToClient: execution,
            });
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">
          {messages.paymentOrders.fileType.order_form}
        </span>
        <Switch
          checked={orderForm}
          disabled={isPending}
          onCheckedChange={(checked) => {
            setOrderForm(checked);
            save({
              isSwiftVisibleToClient: swift,
              isOrderFormVisibleToClient: checked,
              isExecutionVisibleToClient: execution,
            });
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">
          {messages.paymentOrders.visibilityFields.execution}
        </span>
        <Switch
          checked={execution}
          disabled={isPending}
          onCheckedChange={(checked) => {
            setExecution(checked);
            save({
              isSwiftVisibleToClient: swift,
              isOrderFormVisibleToClient: orderForm,
              isExecutionVisibleToClient: checked,
            });
          }}
        />
      </div>
    </SectionCard>
  );
}

function ManagerNoteCard({ order }: { order: PaymentOrder }) {
  const [note, setNote] = useState(order.managerNote);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updatePaymentOrderNote({
        paymentOrderId: order.id,
        managerNote: note,
      });
      if (result.ok) toast.success(messages.paymentOrders.noteSaved);
      else toast.error(result.error);
    });
  }

  return (
    <SectionCard title={messages.paymentOrders.fields.managerNote}>
      <Field>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="text-muted-foreground text-sm">
          {messages.paymentOrders.managerNoteHint}
        </p>
      </Field>
      <Button
        variant="outline"
        onClick={save}
        disabled={isPending}
        className="self-start"
      >
        {messages.common.actions.save}
      </Button>
    </SectionCard>
  );
}
