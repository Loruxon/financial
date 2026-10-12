"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import ExcelJS from "exceljs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/ru";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Числовые/денежные колонки выравниваются вправо. */
    align?: "right";
    /** Заголовок при выгрузке в Excel, если отличается от `header`. */
    exportHeader?: string;
  }
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  error?: string;
  emptyState: ReactNode;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  exportFileName?: string;
};

function updateSearchParams(
  current: URLSearchParams,
  updates: Record<string, string | null>,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  return next;
}

/**
 * Обёртка TanStack Table над `Table`: сортировка по клику на заголовок и
 * страница — в query-параметрах URL; выбор видимых колонок; выгрузка в Excel;
 * состояния загрузки, пустого списка и ошибки.
 *
 * @example
 * <DataTable columns={columns} data={orders} onRowClick={(o) => router.push(`/manager/payment-orders/${o.id}`)} />
 */
export function DataTable<TData>({
  columns,
  data,
  isLoading,
  error,
  emptyState,
  onRowClick,
  pageSize = 25,
  exportFileName = "export",
}: DataTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const sortId = searchParams.get("sort");
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const sorting: SortingState = useMemo(
    () => (sortId ? [{ id: sortId, desc: sortDir === "desc" }] : []),
    [sortId, sortDir],
  );

  function goTo(updates: Record<string, string | null>) {
    const next = updateSearchParams(searchParams, updates);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's returned functions are not memoizable by design
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex: page - 1, pageSize },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      goTo({
        sort: first ? first.id : null,
        dir: first ? (first.desc ? "desc" : "asc") : null,
        page: null,
      });
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      goTo({ page: next.pageIndex === 0 ? null : String(next.pageIndex + 1) });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  async function exportToExcel() {
    const leafColumns = table
      .getVisibleLeafColumns()
      .filter((c) => c.id !== "__actions");
    const headers = leafColumns.map((column) =>
      typeof column.columnDef.meta?.exportHeader === "string"
        ? column.columnDef.meta.exportHeader
        : ((column.columnDef.header as string) ?? column.id),
    );
    const rows = table
      .getSortedRowModel()
      .rows.map((row) =>
        leafColumns.map((column) => row.getValue(column.id) ?? ""),
      );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data");
    sheet.addRow(headers);
    for (const row of rows) sheet.addRow(row);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFileName}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const rows = table.getRowModel().rows;
  const columnCount = table.getVisibleLeafColumns().length;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <SlidersHorizontal />
            {messages.common.actions.filters}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllLeafColumns().map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(checked) =>
                  column.toggleVisibility(!!checked)
                }
              >
                {typeof column.columnDef.header === "string"
                  ? column.columnDef.header
                  : column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download />
          {messages.common.actions.export}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{messages.common.errors.generic}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const align = header.column.columnDef.meta?.align;
                    const canSort = header.column.getCanSort();
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(align === "right" && "text-right")}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5",
                              align === "right" && "flex-row-reverse",
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="size-3.5" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="text-muted-foreground size-3.5" />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize > 10 ? 10 : pageSize }).map(
                  (_, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {Array.from({ length: columnCount }).map(
                        (__, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  ),
                )
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="p-0">
                    {emptyState}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={() => onRowClick?.(row.original)}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onRowClick(row.original);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.columnDef.meta?.align === "right" &&
                            "text-right",
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!error && rows.length > 0 ? (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text={messages.common.pagination.previous}
                aria-disabled={page <= 1}
                className={
                  page <= 1 ? "pointer-events-none opacity-50" : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1)
                    goTo({ page: page - 1 === 1 ? null : String(page - 1) });
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-muted-foreground px-2 text-sm">
                {messages.common.pagination.page} {page}{" "}
                {messages.common.pagination.of} {Math.max(1, pageCount)}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                text={messages.common.pagination.next}
                aria-disabled={page >= pageCount}
                className={
                  page >= pageCount
                    ? "pointer-events-none opacity-50"
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (page < pageCount) goTo({ page: String(page + 1) });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
