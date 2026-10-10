"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/format";
import { messages } from "@/messages/ru";
import type { PaymentOrderFileType } from "@/modules/payment-orders/types";

type FileEntry = {
  id: string;
  file: File;
  fileType: PaymentOrderFileType;
  progress: number;
};

type FileUploadProps = {
  documentTypes: PaymentOrderFileType[];
  onFilesChange?: (
    files: { file: File; fileType: PaymentOrderFileType }[],
  ) => void;
};

/**
 * Зона загрузки файлов (кнопка + drag-and-drop) с имитацией прогресса.
 * На этапе прототипа файлы остаются в памяти браузера.
 *
 * @example
 * <FileUpload documentTypes={["invoice", "contract_request", "other"]} onFilesChange={setFiles} />
 */
export function FileUpload({ documentTypes, onFilesChange }: FileUploadProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onFilesChange?.(
      entries.map((entry) => ({ file: entry.file, fileType: entry.fileType })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const defaultType = documentTypes[0] ?? "other";
    const newEntries: FileEntry[] = Array.from(fileList).map((file) => ({
      id: `${file.name}_${file.size}_${crypto.randomUUID()}`,
      file,
      fileType: defaultType,
      progress: 0,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    for (const entry of newEntries) simulateProgress(entry.id);
  }

  function simulateProgress(id: string) {
    const step = () => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? { ...entry, progress: Math.min(100, entry.progress + 20) }
            : entry,
        ),
      );
    };
    const interval = setInterval(() => {
      step();
    }, 150);
    setTimeout(() => clearInterval(interval), 150 * 6);
  }

  function removeFile(id: string) {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  function setFileType(id: string, fileType: PaymentOrderFileType) {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, fileType } : entry)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center",
          dragging && "border-ring",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="text-muted-foreground size-4" />
        <p className="text-muted-foreground text-sm">
          {messages.fileUpload.dropHint}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          {messages.common.actions.upload}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {entries.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-2 rounded-lg border p-2.5"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <span className="text-sm">{entry.file.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {formatFileSize(entry.file.size)}
                  </span>
                </div>
                <Select
                  items={documentTypes.map((type) => ({
                    value: type,
                    label: messages.paymentOrders.fileType[type],
                  }))}
                  value={entry.fileType}
                  onValueChange={(value) =>
                    setFileType(entry.id, value as PaymentOrderFileType)
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {messages.paymentOrders.fileType[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeFile(entry.id)}
                >
                  <X />
                </Button>
              </div>
              {entry.progress < 100 ? (
                <Progress value={entry.progress} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
