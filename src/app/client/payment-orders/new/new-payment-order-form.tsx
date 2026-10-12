"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useBreadcrumbLabel } from "@/components/custom/breadcrumbs";
import { useConfirm } from "@/components/custom/confirm-dialog";
import { CurrencySelect } from "@/components/custom/currency-select";
import { EntityCombobox } from "@/components/custom/entity-combobox";
import { FileUpload } from "@/components/custom/file-upload";
import { FormSection } from "@/components/custom/form-section";
import { Money } from "@/components/custom/money";
import { MoneyInput } from "@/components/custom/money-input";
import { formatDate } from "@/lib/format";
import { messages } from "@/messages/ru";
import { createBeneficiary } from "@/modules/beneficiaries/actions";
import type {
  Beneficiary,
  BeneficiaryAccount,
  BeneficiaryBank,
} from "@/modules/beneficiaries/types";
import type { IncomingPayment } from "@/modules/incoming-payments/types";
import {
  addPaymentOrderFile,
  submitPaymentOrder,
} from "@/modules/payment-orders/actions";
import {
  getPaymentOrderNumber,
  type PaymentOrderFileType,
} from "@/modules/payment-orders/types";
import type { CurrencyCode } from "@/modules/shared/types";

type BeneficiaryWithBanking = {
  beneficiary: Beneficiary;
  bank: BeneficiaryBank | undefined;
  account: BeneficiaryAccount | undefined;
};

type IncomingPaymentOption = {
  payment: IncomingPayment;
  payerName: string;
  remainder: string;
};

type NewPaymentOrderFormProps = {
  beneficiaries: BeneficiaryWithBanking[];
  incomingPayments: IncomingPaymentOption[];
};

const DOCUMENT_TYPES: PaymentOrderFileType[] = [
  "invoice",
  "contract_request",
  "customs_declaration",
  "transport",
  "other",
];

export function NewPaymentOrderForm({
  beneficiaries: initialBeneficiaries,
  incomingPayments,
}: NewPaymentOrderFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  useBreadcrumbLabel(messages.paymentOrders.newTitle);
  const [beneficiaries, setBeneficiaries] = useState(initialBeneficiaries);
  const [beneficiaryId, setBeneficiaryId] = useState<string | null>(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode | undefined>(undefined);
  const [paymentDetails, setPaymentDetails] = useState("");

  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [fundingAmountRub, setFundingAmountRub] = useState("");
  const [fundingTouched, setFundingTouched] = useState(false);

  const [files, setFiles] = useState<
    { file: File; fileType: PaymentOrderFileType }[]
  >([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const selected = beneficiaries.find(
    (b) => b.beneficiary.id === beneficiaryId,
  );
  const availableCurrencies = selected?.account?.currencies;

  const isDirty =
    beneficiaryId !== null ||
    invoiceNumber !== "" ||
    amount !== "" ||
    paymentDetails !== "" ||
    selectedPaymentIds.length > 0 ||
    files.length > 0;

  function toggleIncomingPayment(paymentId: string, checked: boolean) {
    setSelectedPaymentIds((prev) => {
      const next = checked
        ? [...prev, paymentId]
        : prev.filter((pid) => pid !== paymentId);
      if (!fundingTouched) {
        const total = incomingPayments
          .filter((p) => next.includes(p.payment.id))
          .reduce((sum, p) => sum + Number(p.remainder), 0);
        setFundingAmountRub(total > 0 ? total.toFixed(2) : "");
      }
      return next;
    });
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    const v = messages.paymentOrders.validation;
    if (!beneficiaryId) next.beneficiaryId = v.beneficiaryRequired;
    if (!invoiceNumber.trim()) next.invoiceNumber = v.invoiceNumberRequired;
    if (!amount || Number(amount) <= 0) next.amount = v.amountRequired;
    if (!currency) next.currency = v.currencyRequired;
    if (selectedPaymentIds.length === 0) next.funding = v.fundingRequired;
    if (!fundingAmountRub || Number(fundingAmountRub) <= 0) {
      next.fundingAmountRub = v.fundingAmountRequired;
    }
    return next;
  }

  function handleSubmit() {
    const validation = validate();
    setErrors(validation);
    const firstKey = Object.keys(validation)[0];
    if (firstKey) {
      document
        .getElementById(`field-${firstKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    startTransition(async () => {
      const result = await submitPaymentOrder({
        invoiceNumber,
        amount,
        currency: currency!,
        paymentDetails,
        beneficiaryId: beneficiaryId!,
        incomingPaymentIds: selectedPaymentIds,
        fundingAmountRub,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      for (const entry of files) {
        const fileResult = await addPaymentOrderFile({
          paymentOrderId: result.data.id,
          section: "payment",
          fileType: entry.fileType,
          originalName: entry.file.name,
          sizeBytes: entry.file.size,
        });
        if (!fileResult.ok) toast.error(fileResult.error);
      }
      toast.success(
        `${messages.paymentOrders.titleOne} № ${getPaymentOrderNumber(result.data.id)} ${messages.paymentOrders.submitted}`,
      );
      router.push(`/client/payment-orders/${result.data.id}`);
    });
  }

  async function handleCancel() {
    if (isDirty) {
      const confirmed = await confirm({
        title: messages.paymentOrders.cancelConfirm.title,
        description: messages.paymentOrders.cancelConfirm.description,
      });
      if (!confirmed) return;
    }
    router.push("/client/payment-orders");
  }

  return (
    <div className="flex flex-col gap-6">
      <FormSection title={messages.beneficiaries.titleOne}>
        <Field
          id="field-beneficiaryId"
          data-invalid={errors.beneficiaryId ? "true" : undefined}
        >
          <FieldLabel>{messages.paymentOrders.fields.beneficiary}</FieldLabel>
          <EntityCombobox
            options={beneficiaries.map((b) => ({
              value: b.beneficiary.id,
              label: b.beneficiary.name,
            }))}
            value={beneficiaryId}
            onValueChange={(value) => {
              setBeneficiaryId(value);
              setCurrency(undefined);
            }}
            onCreateNew={() => setAddSheetOpen(true)}
            createNewLabel={messages.beneficiaries.empty.createFirst}
            aria-invalid={!!errors.beneficiaryId}
          />
          {errors.beneficiaryId ? (
            <FieldError>{errors.beneficiaryId}</FieldError>
          ) : null}
        </Field>
        {selected?.bank && selected.account ? (
          <div className="text-muted-foreground flex flex-col gap-2 rounded-lg border p-4 text-sm">
            <span>
              {selected.bank.name}, {selected.bank.address}
            </span>
            <span>SWIFT: {selected.bank.swiftCode}</span>
            <span>
              {messages.beneficiaries.accounts.shortLabel}:{" "}
              {selected.account.accountNumber}
            </span>
          </div>
        ) : null}
      </FormSection>

      <FormSection title={messages.paymentOrders.sections.payment}>
        <Field
          id="field-invoiceNumber"
          data-invalid={errors.invoiceNumber ? "true" : undefined}
        >
          <FieldLabel htmlFor="invoiceNumber">
            {messages.paymentOrders.fields.invoiceNumber}
          </FieldLabel>
          <Input
            id="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            aria-invalid={!!errors.invoiceNumber}
          />
          {errors.invoiceNumber ? (
            <FieldError>{errors.invoiceNumber}</FieldError>
          ) : null}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            id="field-amount"
            data-invalid={errors.amount ? "true" : undefined}
          >
            <FieldLabel>{messages.paymentOrders.fields.amount}</FieldLabel>
            <MoneyInput
              value={amount}
              onValueChange={setAmount}
              currencyLabel={currency}
              aria-invalid={!!errors.amount}
            />
            {errors.amount ? <FieldError>{errors.amount}</FieldError> : null}
          </Field>
          <Field
            id="field-currency"
            data-invalid={errors.currency ? "true" : undefined}
          >
            <FieldLabel>{messages.paymentOrders.fields.currency}</FieldLabel>
            <CurrencySelect
              value={currency}
              onValueChange={setCurrency}
              currencies={availableCurrencies}
              disabled={!selected}
            />
            {errors.currency ? (
              <FieldError>{errors.currency}</FieldError>
            ) : null}
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="paymentDetails">
            {messages.paymentOrders.fields.paymentDetails}
          </FieldLabel>
          <Textarea
            id="paymentDetails"
            value={paymentDetails}
            onChange={(e) => setPaymentDetails(e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title={messages.paymentOrders.sections.funding}>
        <div id="field-funding" className="flex flex-col gap-2">
          {incomingPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {messages.paymentOrders.noAvailableIncomingPayments}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>
                    {messages.incomingPayments.fields.paymentDate}
                  </TableHead>
                  <TableHead>
                    {messages.incomingPayments.fields.payer}
                  </TableHead>
                  <TableHead className="text-right">
                    {messages.paymentOrders.fields.clientRemainderRub}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingPayments.map(({ payment, payerName, remainder }) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPaymentIds.includes(payment.id)}
                        onCheckedChange={(checked) =>
                          toggleIncomingPayment(payment.id, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>{payerName}</TableCell>
                    <TableCell className="text-right">
                      <Money value={remainder} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {errors.funding ? <FieldError>{errors.funding}</FieldError> : null}
        </div>
        <Field
          id="field-fundingAmountRub"
          data-invalid={errors.fundingAmountRub ? "true" : undefined}
        >
          <FieldLabel>
            {messages.paymentOrders.fields.fundingAmountRub}
          </FieldLabel>
          <MoneyInput
            value={fundingAmountRub}
            onValueChange={(value) => {
              setFundingAmountRub(value);
              setFundingTouched(true);
            }}
            currencyLabel="₽"
            aria-invalid={!!errors.fundingAmountRub}
          />
          {errors.fundingAmountRub ? (
            <FieldError>{errors.fundingAmountRub}</FieldError>
          ) : null}
        </Field>
      </FormSection>

      <FormSection
        title={messages.paymentOrders.sections.documents}
        separator={false}
      >
        <FileUpload documentTypes={DOCUMENT_TYPES} onFilesChange={setFiles} />
      </FormSection>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {messages.paymentOrders.actions.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={handleCancel}
        >
          {messages.common.actions.cancel}
        </Button>
      </div>

      <AddBeneficiarySheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        onCreated={(created) => {
          setBeneficiaries((prev) => [...prev, created]);
          setBeneficiaryId(created.beneficiary.id);
        }}
      />
    </div>
  );
}

const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "EUR", "CNY"];

function AddBeneficiarySheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: BeneficiaryWithBanking) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [currencies, setCurrencies] = useState<CurrencyCode[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggleCurrency(code: CurrencyCode, checked: boolean) {
    setCurrencies((prev) =>
      checked ? [...prev, code] : prev.filter((c) => c !== code),
    );
  }

  function submit() {
    if (
      !name ||
      !address ||
      !bankName ||
      !bankAddress ||
      !swiftCode ||
      !accountNumber ||
      currencies.length === 0
    ) {
      toast.error(messages.common.errors.allFieldsRequired);
      return;
    }
    startTransition(async () => {
      const result = await createBeneficiary({
        name,
        address,
        bankName,
        bankAddress,
        swiftCode,
        accountNumber,
        currencies,
      });
      if (result.ok) {
        onCreated(result.data);
        onOpenChange(false);
        setName("");
        setAddress("");
        setBankName("");
        setBankAddress("");
        setSwiftCode("");
        setAccountNumber("");
        setCurrencies([]);
        toast.success(messages.beneficiaries.empty.createFirst);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{messages.beneficiaries.empty.createFirst}</SheetTitle>
          <SheetDescription>
            {messages.beneficiaries.addSheetDescription}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <Field>
            <FieldLabel htmlFor="new-ben-name">
              {messages.beneficiaries.fields.name}
            </FieldLabel>
            <Input
              id="new-ben-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-ben-address">
              {messages.beneficiaries.fields.address}
            </FieldLabel>
            <Input
              id="new-ben-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-ben-bank-name">
              {messages.beneficiaries.banks.fields.name}
            </FieldLabel>
            <Input
              id="new-ben-bank-name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-ben-bank-address">
              {messages.beneficiaries.banks.fields.address}
            </FieldLabel>
            <Input
              id="new-ben-bank-address"
              value={bankAddress}
              onChange={(e) => setBankAddress(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-ben-swift">
              {messages.beneficiaries.banks.fields.swiftCode}
            </FieldLabel>
            <Input
              id="new-ben-swift"
              value={swiftCode}
              onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-ben-account">
              {messages.beneficiaries.accounts.fields.accountNumber}
            </FieldLabel>
            <Input
              id="new-ben-account"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>
              {messages.beneficiaries.accounts.fields.currencies}
            </FieldLabel>
            <div className="flex flex-col gap-2">
              {CURRENCY_OPTIONS.map((code) => (
                <label key={code} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={currencies.includes(code)}
                    onCheckedChange={(checked) =>
                      toggleCurrency(code, !!checked)
                    }
                  />
                  {code}
                </label>
              ))}
            </div>
          </Field>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {messages.common.actions.cancel}
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {messages.common.actions.create}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
