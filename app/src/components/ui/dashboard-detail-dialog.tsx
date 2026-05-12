"use client";

import type { ReactNode } from "react";
import { ClipboardList, Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type DashboardDetailMetric = {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  accent?: string;
};

export type DashboardDetailRow = {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
};

export type DashboardDetailTable = {
  columns: string[];
  rows: Array<Array<ReactNode>>;
};

export type DashboardDetail = {
  title: string;
  subtitle?: string;
  badge?: string;
  metrics?: DashboardDetailMetric[];
  rows?: DashboardDetailRow[];
  table?: DashboardDetailTable;
  note?: ReactNode;
};

const rightAlignedColumns = [
  "gmv",
  "amount",
  "value",
  "rate",
  "qty",
  "quantity",
  "orders",
  "items",
  "revenue",
  "fees",
  "refund",
  "price",
  "aov",
  "units",
  "total",
  "active",
  "booked",
  "released",
];

const leftAlignedColumns = [
  "order",
  "source",
  "status",
  "city",
  "province",
  "product",
  "sku",
  "type",
  "name",
  "method",
  "courier",
  "channel",
];

function isRightAlignedColumn(column: string) {
  const normalized = column.toLowerCase();
  return rightAlignedColumns.some((keyword) => normalized.includes(keyword))
    && !leftAlignedColumns.some((keyword) => normalized.includes(keyword));
}

function columnClassName(column: string, index: number) {
  const normalized = column.toLowerCase();
  const isStickyFirstColumn = index === 0;
  const isProductColumn = normalized.includes("product");
  const isTextColumn = leftAlignedColumns.some((keyword) => normalized.includes(keyword));
  const alignRight = isRightAlignedColumn(column);

  return cn(
    "px-3 py-3 align-top",
    isStickyFirstColumn ? "sticky left-0 z-10 min-w-[148px] bg-card/95 text-left shadow-[1px_0_0_rgba(148,163,184,0.18)]" : "",
    isProductColumn ? "min-w-[280px] max-w-[440px] text-left" : "",
    !isStickyFirstColumn && isTextColumn && !isProductColumn ? "min-w-[128px] text-left" : "",
    !isStickyFirstColumn && !isTextColumn && !isProductColumn ? "min-w-[118px]" : "",
    alignRight ? "text-right tabular-nums" : "text-left",
  );
}

export function DashboardDetailDialog({
  detail,
  onClose,
}: {
  detail: DashboardDetail | null;
  onClose: () => void;
}) {
  const isLoadingNote = typeof detail?.note === "string" && /loading/i.test(detail.note);

  return (
    <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) onClose(); }}>
      {detail ? (
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-border/80 bg-card/95 p-0 shadow-2xl shadow-black/35 backdrop-blur-xl sm:h-auto sm:max-h-[90vh] sm:max-w-5xl">
          <div className="relative shrink-0 overflow-hidden border-b border-border/80 bg-gradient-to-br from-background/95 via-card to-muted/30 px-4 py-4 sm:px-6 sm:py-5">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300" />
            <DialogHeader className="pr-10">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary sm:flex">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {detail.badge ? (
                      <span className="inline-flex items-center gap-2 rounded-[8px] border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                        <Info className="h-3.5 w-3.5" />
                        {detail.badge}
                      </span>
                    ) : null}
                  </div>
                  <DialogTitle className="break-words text-lg font-bold leading-tight text-foreground sm:text-2xl">
                    {detail.title}
                  </DialogTitle>
                  {detail.subtitle ? (
                    <DialogDescription className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                      {detail.subtitle}
                    </DialogDescription>
                  ) : null}
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-5">
            {detail.metrics?.length ? (
              <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {detail.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="min-w-0 rounded-[8px] border border-border/80 bg-gradient-to-b from-background/80 to-background/35 p-3.5 shadow-sm"
                    style={{ borderTopColor: metric.accent ?? undefined, borderTopWidth: metric.accent ? 3 : undefined }}
                  >
                    <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 break-words text-xl font-bold leading-tight text-foreground sm:text-2xl" style={{ color: metric.accent }}>
                      {metric.value}
                    </p>
                    {metric.helper ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.helper}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {detail.rows?.length ? (
              <dl className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {detail.rows.map((row) => (
                  <div
                    key={row.label}
                    className="min-w-0 rounded-[8px] border border-border/80 bg-background/30 px-3 py-3 shadow-sm sm:px-3.5"
                  >
                    <dt className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px]">
                      {row.label}
                    </dt>
                    <dd className="mt-1 min-w-0 text-sm font-semibold leading-5 text-foreground">
                      <div className="line-clamp-2 break-words" title={typeof row.value === "string" ? row.value : undefined}>
                        {row.value}
                      </div>
                      {row.helper ? <div className="mt-1 text-xs font-normal leading-5 text-muted-foreground">{row.helper}</div> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {detail.table ? (
              <div className="overflow-hidden rounded-[8px] border border-border/80 bg-background/20 shadow-sm">
                <div className="max-h-[48vh] overflow-auto">
                  <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-20">
                      <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
                      {detail.table.columns.map((column, index) => (
                        <th key={`${column}-${index}`} className={cn(columnClassName(column, index), "border-b border-border/80 font-bold")}>
                          {column}
                        </th>
                      ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="group border-b border-border/50 transition-colors hover:bg-muted/20">
                          {row.map((cell, cellIndex) => {
                            const column = detail.table?.columns[cellIndex] ?? "";
                            return (
                              <td
                                key={`${rowIndex}-${cellIndex}`}
                                className={cn(
                                  columnClassName(column, cellIndex),
                                  "border-b border-border/50 text-foreground last:border-r-0 group-last:border-b-0",
                                  cellIndex === 0 ? "group-hover:bg-muted/40" : "",
                                )}
                              >
                                <div className={cn("min-w-0", isRightAlignedColumn(column) ? "ml-auto" : "", column.toLowerCase().includes("product") ? "line-clamp-3" : "truncate")}>
                                  {cell}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {detail.note ? (
              <div className="mt-5 flex items-start gap-3 rounded-[8px] border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-muted-foreground">
                {isLoadingNote ? (
                  <span className="mt-1 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                ) : (
                  <Info className="mt-1 h-4 w-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0 break-words">{detail.note}</div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
