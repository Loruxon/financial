import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { messages } from "@/messages/ru";
import type { PaymentOrderFile } from "@/modules/payment-orders/types";

type FileListProps = {
  files: PaymentOrderFile[];
  onDownload?: (file: PaymentOrderFile) => void;
};

/**
 * Список прикреплённых файлов: иконка, имя, тип документа, размер, дата,
 * кнопка «Скачать».
 *
 * @example
 * <FileList files={files} onDownload={(file) => download(file.id)} />
 */
export function FileList({ files, onDownload }: FileListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex items-center gap-4 rounded-lg border p-2.5"
        >
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="text-sm">{file.originalName}</span>
            <span className="text-muted-foreground text-sm">
              {messages.paymentOrders.fileType[file.fileType]} ·{" "}
              {formatFileSize(file.sizeBytes)} ·{" "}
              {formatDateTime(file.uploadedAt)}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onDownload?.(file)}>
            {messages.common.actions.download}
          </Button>
        </li>
      ))}
    </ul>
  );
}
