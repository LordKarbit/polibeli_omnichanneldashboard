"use client";

import { useState, type ReactNode } from "react";
import type { EChartsOption } from "echarts";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Percent,
  ReceiptText,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { EChart } from "@/components/charts/echart";
import { DashboardDetailDialog, type DashboardDetail } from "@/components/ui/dashboard-detail-dialog";
import { ChartCard } from "@/components/ui/chart-card";
import { mergeChartOptions } from "@/lib/chart-config";
import { abbreviateIDR, formatIDR, formatNumber } from "@/lib/format";
import { useIncomeDashboardData, type IncomeDashboard } from "@/lib/income-client";
import { cn } from "@/lib/utils";

type SourceComparison = IncomeDashboard["sourceComparison"][number];
type FeeComponent = IncomeDashboard["feeComponents"][number];
type SettlementSourceMix = IncomeDashboard["settlementSourceMix"][number];
type NamedValue = { name: string; value: number; source?: string };
type IncomeSourceFilter = "all" | "shopee" | "tiktok1" | "tiktok2";
type IncomeChartClickParams = { name?: string; seriesName?: string; value?: unknown; dataIndex?: number };
type ApiResponse<T> = { ok: boolean; data?: T; error?: { message?: string } };
type IncomeOrderRow = {
  orderKey: string;
  sourceSystem: string;
  shopAccount: string;
  sourceOrderId: string;
  normalizedStatus: string;
  orderCreatedAt: string | null;
  bookedOrderGmv: number;
  activeOrderGmv: number;
  orderRefundAmount: number;
  city: string | null;
};
type IncomeOrderItem = {
  sourceSkuCode: string;
  sourceProductName: string | null;
  quantity: number;
  returnedQuantity: number;
  unitDiscountedPrice: number;
  lineGmv: number;
  lineDiscountAmount: number;
  skuType: string;
};
type IncomeOrderDetailPayload = {
  order: {
    orderKey: string;
    sourceOrderId: string;
    sourceSystem: string;
    shopAccount: string;
    normalizedStatus: string;
    orderCreatedAt: string | null;
    bookedOrderGmv: number;
    activeOrderGmv: number;
    orderRefundAmount: number;
    shippingFeeAmount: number;
    paymentMethod: string | null;
  };
  items: IncomeOrderItem[];
  marketplace: {
    marketplaceStatusRaw?: string | null;
    paymentStatusRaw?: string | null;
    fulfillmentStatusRaw?: string | null;
    cancellationReason?: string | null;
    logisticsProvider?: string | null;
    trackingNumber?: string | null;
    refundAmount?: number | null;
  } | null;
};

type FilteredSettlementSummary = {
  totalReleased: number;
  totalRevenue: number;
  totalFees: number;
  totalOrders: number;
  totalBuyers: number;
  totalAdjustments: number;
  totalWithdrawals: number;
  feeRate: number;
  releaseRate: number;
  releaseGap: number;
};

const sourceColors: Record<string, string> = {
  shopee: "#f97316",
  tiktok1: "#ef4444",
  tiktok2: "#ec4899",
  Shopee: "#f97316",
  "TikTok Shop (Kayou ID)": "#ef4444",
  "TikTok Shop (Kayou Card ID)": "#ec4899",
};

function compactSourceName(value: string) {
  return value
    .replace("TikTok Shop (Kayou ID)", "TikTok ID")
    .replace("TikTok Shop (Kayou Card ID)", "TikTok Card");
}

function shortName(value: string, max = 34) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function percentRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function signedIDR(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatIDR(value)}`;
}

function sourceColor(source: string, key?: string) {
  return sourceColors[key ?? ""] ?? sourceColors[source] ?? "#38bdf8";
}

function settlementSourceColor(row: SettlementSourceMix) {
  const text = `${row.orderSource} ${row.source}`.toLowerCase();
  if (text.includes("tokopedia")) return "#22c55e";
  if (text.includes("shopee")) return "#f97316";
  if (text.includes("card")) return "#ec4899";
  if (text.includes("tiktok")) return "#06b6d4";
  return sourceColor(row.source, row.sourceKey);
}

function tooltipValue(params: unknown) {
  const p = Array.isArray(params) ? params : [params];
  return p
    .map((item) => {
      const row = item as { marker?: string; seriesName?: string; value?: number | string; name?: string };
      return `${row.marker ?? ""}${row.seriesName ?? row.name}: ${formatIDR(Number(row.value ?? 0))}`;
    })
    .join("<br/>");
}

function buildFilteredSummary(sources: IncomeDashboard["sources"]): FilteredSettlementSummary {
  const totalReleased = sources.reduce((sum, source) => sum + source.releasedAmount, 0);
  const totalRevenue = sources.reduce((sum, source) => sum + source.totalRevenue, 0);
  const totalFees = sources.reduce((sum, source) => sum + source.totalFees, 0);
  const totalOrders = sources.reduce((sum, source) => sum + source.orderCount, 0);
  const totalBuyers = sources.reduce((sum, source) => sum + source.buyerCount, 0);
  const totalAdjustments = sources.reduce((sum, source) => sum + source.adjustmentAmount, 0);
  const totalWithdrawals = sources.reduce((sum, source) => sum + source.withdrawalAmount, 0);

  return {
    totalReleased,
    totalRevenue,
    totalFees,
    totalOrders,
    totalBuyers,
    totalAdjustments,
    totalWithdrawals,
    feeRate: totalRevenue ? Math.abs(totalFees) / totalRevenue : 0,
    releaseRate: totalRevenue ? totalReleased / totalRevenue : 0,
    releaseGap: totalRevenue - totalReleased,
  };
}

function getMarketplacePnlOption(data: SourceComparison[]): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: "axis", formatter: tooltipValue },
    legend: { bottom: 0, textStyle: { color: "rgba(255,255,255,0.72)", fontSize: 11 } },
    grid: { left: 12, right: 12, top: 18, bottom: 52, containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((source) => compactSourceName(source.source)),
      axisLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: "rgba(255,255,255,0.55)" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series: [
      {
        name: "Total Revenue",
        type: "bar",
        barWidth: 18,
        data: data.map((source) => ({ value: source.totalRevenue, itemStyle: { color: "#38bdf8", borderRadius: [4, 4, 0, 0] } })),
      },
      {
        name: "Released Amount",
        type: "bar",
        barWidth: 18,
        data: data.map((source) => ({ value: source.releasedAmount, itemStyle: { color: source.color, borderRadius: [4, 4, 0, 0] } })),
      },
      {
        name: "Fees / Expenses",
        type: "bar",
        barWidth: 18,
        data: data.map((source) => ({ value: Math.abs(source.totalFees), itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } })),
      },
    ],
  });
}

function getCashBridgeOption(summary: FilteredSettlementSummary): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) =>
        (Array.isArray(params) ? params : [params])
          .map((item) => {
            const row = item as { marker?: string; name?: string; value?: number };
            return `${row.marker ?? ""}${row.name}: ${signedIDR(Number(row.value ?? 0))}`;
          })
          .join("<br/>"),
    },
    grid: { left: 12, right: 12, top: 18, bottom: 12, containLabel: true },
    xAxis: {
      type: "category",
      data: ["Revenue", "Fees", "Adjustments", "Released", "Gap"],
      axisLabel: { color: "rgba(255,255,255,0.65)", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: "rgba(255,255,255,0.55)" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series: [{
      name: "Amount",
      type: "bar",
      barWidth: 24,
      label: { show: true, position: "top", color: "rgba(255,255,255,0.68)", fontSize: 10, formatter: (p: { value?: unknown }) => abbreviateIDR(Math.abs(Number(p.value ?? 0))) },
      data: [
        { value: summary.totalRevenue, itemStyle: { color: "#38bdf8", borderRadius: [5, 5, 0, 0] } },
        { value: -Math.abs(summary.totalFees), itemStyle: { color: "#f59e0b", borderRadius: [5, 5, 0, 0] } },
        { value: summary.totalAdjustments, itemStyle: { color: "#ec4899", borderRadius: [5, 5, 0, 0] } },
        { value: summary.totalReleased, itemStyle: { color: "#10b981", borderRadius: [5, 5, 0, 0] } },
        { value: summary.releaseGap, itemStyle: { color: summary.releaseGap >= 0 ? "#64748b" : "#ef4444", borderRadius: [5, 5, 0, 0] } },
      ],
    }],
  });
}

function getRateOption(data: SourceComparison[]): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) =>
        (Array.isArray(params) ? params : [params])
          .map((item) => {
            const row = item as { marker?: string; seriesName?: string; value?: number };
            return `${row.marker ?? ""}${row.seriesName}: ${Number(row.value ?? 0).toFixed(1)}%`;
          })
          .join("<br/>"),
    },
    legend: { bottom: 0, textStyle: { color: "rgba(255,255,255,0.72)", fontSize: 11 } },
    grid: { left: 12, right: 18, top: 18, bottom: 52, containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((source) => compactSourceName(source.source)),
      axisLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: { formatter: "{value}%", color: "rgba(255,255,255,0.55)" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series: [
      {
        name: "Release Rate",
        type: "bar",
        data: data.map((source) => ({ value: source.releaseRate * 100, itemStyle: { color: source.color, borderRadius: [4, 4, 0, 0] } })),
      },
      {
        name: "Fee Rate",
        type: "bar",
        data: data.map((source) => ({ value: source.feeRate * 100, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } })),
      },
    ],
  });
}

function getFeeBreakdownOption(fees: FeeComponent[]): EChartsOption {
  const rows = fees.slice(0, 14).reverse();
  return mergeChartOptions({
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const item = (Array.isArray(params) ? params[0] : params) as { dataIndex?: number; marker?: string };
        const row = rows[item.dataIndex ?? 0];
        return `<strong>${compactSourceName(row.source)}</strong><br/>${row.name}<br/>${item.marker ?? ""}${formatIDR(row.value)}`;
      },
    },
    grid: { left: 12, right: 18, top: 8, bottom: 12, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: "rgba(255,255,255,0.55)" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    yAxis: {
      type: "category",
      data: rows.map((row) => shortName(row.name, 28)),
      axisLabel: { color: "rgba(255,255,255,0.65)", fontSize: 10 },
    },
    series: [{
      name: "Fee",
      type: "bar",
      data: rows.map((row) => ({
        value: row.absoluteValue,
        itemStyle: { color: sourceColor(row.source), borderRadius: [0, 4, 4, 0] },
      })),
    }],
  });
}

function getDailyReleasedOption(daily: IncomeDashboard["dailyReleased"], focus: IncomeSourceFilter): EChartsOption {
  const series = [
    { key: "shopee" as const, name: "Shopee", color: "#f97316" },
    { key: "tiktok1" as const, name: "TikTok ID", color: "#ef4444" },
    { key: "tiktok2" as const, name: "TikTok Card", color: "#ec4899" },
  ].filter((item) => focus === "all" || item.key === focus);

  return mergeChartOptions({
    tooltip: { trigger: "axis", formatter: tooltipValue },
    legend: { bottom: 0, textStyle: { color: "rgba(255,255,255,0.72)", fontSize: 11 } },
    grid: { left: 12, right: 12, top: 18, bottom: 52, containLabel: true },
    xAxis: {
      type: "category",
      data: daily.map((day) => String(day.date).slice(5)),
      axisLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: "rgba(255,255,255,0.55)" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series: series.map((item) => ({
      name: item.name,
      type: "line" as const,
      smooth: true,
      showSymbol: false,
      data: daily.map((day) => Number(day[item.key] ?? 0)),
      lineStyle: { color: item.color, width: 3 },
      areaStyle: {
        color: {
          type: "linear" as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{ offset: 0, color: `${item.color}26` }, { offset: 1, color: `${item.color}03` }],
        },
      },
    })),
  });
}

function getDonutOption(rows: NamedValue[], title: string): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: "item",
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>${formatIDR(p.value)}<br/>${p.percent.toFixed(1)}%`;
      },
    },
    legend: { bottom: 0, type: "scroll", textStyle: { color: "rgba(255,255,255,0.72)", fontSize: 11 } },
    series: [{
      name: title,
      type: "pie",
      radius: ["50%", "74%"],
      center: ["50%", "43%"],
      itemStyle: { borderRadius: 7, borderColor: "rgba(2,6,23,0.9)", borderWidth: 3 },
      label: { color: "rgba(255,255,255,0.72)", formatter: "{d}%", fontSize: 10, fontWeight: 700 },
      data: rows.map((row) => ({ name: row.name, value: Math.abs(row.value) })),
    }],
  });
}

function getSettlementSourceOption(rows: SettlementSourceMix[]): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: "item",
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>${formatIDR(p.value)}<br/>${p.percent.toFixed(1)}% released`;
      },
    },
    legend: { bottom: 0, type: "scroll", textStyle: { color: "rgba(255,255,255,0.72)", fontSize: 11 } },
    series: [{
      name: "Settlement Source",
      type: "pie",
      radius: ["46%", "72%"],
      center: ["50%", "43%"],
      itemStyle: { borderRadius: 7, borderColor: "rgba(2,6,23,0.9)", borderWidth: 3 },
      label: { color: "rgba(255,255,255,0.72)", formatter: "{d}%", fontSize: 10, fontWeight: 700 },
      data: rows.map((row) => ({
        name: `${row.orderSource} · ${compactSourceName(row.source)}`,
        value: Math.abs(row.releasedAmount),
        itemStyle: { color: settlementSourceColor(row) },
      })),
    }],
  });
}

function getNamedBarOption(rows: NamedValue[], valueName: string): EChartsOption {
  const top = rows.slice(0, 10).reverse();
  return mergeChartOptions({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: tooltipValue },
    grid: { left: 12, right: 16, top: 8, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: "rgba(255,255,255,0.55)" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    yAxis: {
      type: "category",
      data: top.map((row) => shortName(row.name, 26)),
      axisLabel: { color: "rgba(255,255,255,0.65)", fontSize: 10 },
    },
    series: [{
      name: valueName,
      type: "bar",
      data: top.map((row) => ({ value: Math.abs(row.value), itemStyle: { color: "#38bdf8", borderRadius: [0, 4, 4, 0] } })),
    }],
  });
}

function getTopOrdersOption(rows: IncomeDashboard["topOrders"]): EChartsOption {
  const top = rows.slice(0, 12).reverse();
  return mergeChartOptions({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: tooltipValue },
    grid: { left: 12, right: 16, top: 8, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: "rgba(255,255,255,0.55)" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    yAxis: {
      type: "category",
      data: top.map((row) => row.orderId),
      axisLabel: { color: "rgba(255,255,255,0.65)", fontSize: 10 },
    },
    series: [{
      name: "Released Amount",
      type: "bar",
      data: top.map((row) => ({ value: row.releasedAmount, itemStyle: { color: sourceColor(row.source), borderRadius: [0, 4, 4, 0] } })),
    }],
  });
}

function EmptyState({ label = "Upload marketplace income files to unlock this report." }: { label?: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-[8px] border border-dashed border-border bg-muted/10 px-4 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function IncomeDashboardLoading() {
  const stages = ["Reading income workbooks", "Reconciling released amount", "Preparing settlement insights"];
  const sourceColors = ["#f97316", "#06b6d4", "#ec4899"];

  return (
    <div className="animate-fade-in-up space-y-5" aria-live="polite" aria-busy="true">
      <section className="relative overflow-hidden rounded-[8px] border border-border bg-card">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-300 via-cyan-300 to-orange-300" />
        <div className="route-loading-scan pointer-events-none absolute inset-0 opacity-50" />
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_360px] lg:p-6">
          <div className="relative z-10 min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              <Landmark className="h-3.5 w-3.5" />
              Settlement Control Tower
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Loading Income Dashboard</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Preparing released amount, fee load, withdrawals, adjustment registers, and marketplace settlement diagnostics.
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full border border-border bg-background/60">
              <div className="route-loading-progress h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300" />
            </div>
          </div>

          <div className="relative z-10 flex min-h-44 items-center justify-center rounded-[8px] border border-border bg-background/35 p-5">
            <div className="relative h-28 w-28">
              <div className="absolute inset-0 rounded-full border border-cyan-300/20" />
              <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-cyan-300 border-r-cyan-300/70 animate-spin" />
              <div className="absolute inset-5 rounded-full border-2 border-transparent border-b-emerald-300 border-l-orange-300/80 animate-[spin_1.7s_linear_infinite_reverse]" />
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-border bg-card shadow-lg shadow-cyan-500/10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {stages.map((stage, index) => (
          <div key={stage} className="rounded-[8px] border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-border bg-background/45">
                <span className="absolute h-2.5 w-2.5 animate-ping rounded-full opacity-50" style={{ backgroundColor: sourceColors[index] }} />
                <span className="relative h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sourceColors[index] }} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{stage}</p>
                <p className="mt-1 text-xs text-muted-foreground">Step {index + 1} of {stages.length}</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="animate-shimmer h-full rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-[8px] border border-border bg-card p-4">
            <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
            <div className="mt-4 h-8 w-32 rounded-full bg-muted/80 animate-pulse" />
            <div className="mt-5 h-2 rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-muted-foreground/20 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[8px] border border-border bg-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="h-4 w-44 rounded-full bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-[8px] bg-muted animate-pulse" />
          </div>
          <div className="space-y-3">
            {[78, 62, 88, 50, 70].map((width) => (
              <div key={width} className="flex items-center gap-3">
                <div className="h-3 w-20 rounded-full bg-muted animate-pulse" />
                <div className="h-8 flex-1 overflow-hidden rounded-[8px] bg-muted/40">
                  <div className="h-full rounded-[8px] bg-primary/20 animate-pulse" style={{ width: `${width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-border bg-card p-5">
          <div className="mb-5 h-4 w-48 rounded-full bg-muted animate-pulse" />
          <div className="grid h-64 place-items-center rounded-[8px] border border-border bg-background/35">
            <div className="relative h-36 w-36 rounded-full border-[18px] border-cyan-300/25">
              <div className="absolute -inset-[18px] rounded-full border-[18px] border-transparent border-t-orange-300/70 animate-spin" />
              <div className="absolute inset-8 rounded-full bg-card" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettlementTile({ label, value, helper, icon, accent, onClick }: { label: string; value: string; helper: string; icon: ReactNode; accent: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group min-w-0 rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20",
        onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/45" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-foreground">{value}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-border bg-muted/25" style={{ color: accent }}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{helper}</p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/3 rounded-full transition-all duration-500 group-hover:w-full" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
}

function QualityPanel({ summary, sourceCount, onClick }: { summary: FilteredSettlementSummary; sourceCount: number; onClick?: () => void }) {
  const quality =
    !summary.totalRevenue ? "No revenue baseline" :
    summary.releaseRate >= 0.88 ? "Healthy release quality" :
    summary.releaseRate >= 0.75 ? "Watch release conversion" :
    "Needs reconciliation review";
  const qualityColor =
    summary.releaseRate >= 0.88 ? "#10b981" :
    summary.releaseRate >= 0.75 ? "#f59e0b" :
    "#ef4444";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "rounded-[8px] border border-border bg-card p-5",
        onClick ? "cursor-pointer transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45" : "",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Reconciliation State</p>
          <p className="mt-1 text-xs text-muted-foreground">{sourceCount} active settlement source{sourceCount === 1 ? "" : "s"}</p>
        </div>
        <CheckCircle2 className="h-5 w-5" style={{ color: qualityColor }} />
      </div>
      <p className="text-2xl font-bold text-foreground">{quality}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Release rate is {percentRate(summary.releaseRate)} with {abbreviateIDR(Math.abs(summary.totalFees))} fee load and {formatIDR(summary.releaseGap)} revenue-to-release gap in the active filter.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-[8px] border border-border bg-background/35 p-3">
          <span className="block text-muted-foreground">Fee intensity</span>
          <span className="mt-1 block text-base font-bold text-foreground">{percentRate(summary.feeRate)}</span>
        </div>
        <div className="rounded-[8px] border border-border bg-background/35 p-3">
          <span className="block text-muted-foreground">Withdrawals</span>
          <span className="mt-1 block text-base font-bold text-foreground">{abbreviateIDR(summary.totalWithdrawals)}</span>
        </div>
      </div>
    </div>
  );
}

function SourceFocusHero({
  source,
  summary,
  sourceLabel,
  isShopeeFocused,
  onInspect,
}: {
  source: IncomeDashboard["sources"][number] | null;
  summary: FilteredSettlementSummary;
  sourceLabel: string;
  isShopeeFocused: boolean;
  onInspect?: () => void;
}) {
  const sourceColorValue = source?.color ?? "#38bdf8";
  const workbookNames = source?.fileNames?.length ? source.fileNames.slice(0, 3) : ["No source workbook uploaded"];
  const modeLabel = isShopeeFocused ? "Shopee payout operations" : "TikTok Shop and Tokopedia settlement operations";

  return (
    <section className="relative overflow-hidden rounded-[8px] border border-border bg-card">
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: sourceColorValue }} />
      <div className="grid gap-5 p-5 lg:grid-cols-[1.35fr_0.65fr] lg:p-6">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-[8px] border border-border bg-background/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sourceColorValue, boxShadow: `0 0 18px ${sourceColorValue}` }} />
            Marketplace Focus Mode
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{sourceLabel} Settlement Command</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            This view is reorganized for {modeLabel}. The dashboard expands the most useful operational panels, replaces broad multi-source comparisons with focused reconciliation analytics, and keeps every KPI synchronized to this selected marketplace source.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <span className="text-xs text-muted-foreground">Release conversion</span>
              <span className="mt-1 block text-xl font-bold text-foreground">{percentRate(summary.releaseRate)}</span>
            </div>
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <span className="text-xs text-muted-foreground">Fee intensity</span>
              <span className="mt-1 block text-xl font-bold text-foreground">{percentRate(summary.feeRate)}</span>
            </div>
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <span className="text-xs text-muted-foreground">Revenue gap</span>
              <span className="mt-1 block text-xl font-bold text-foreground">{abbreviateIDR(summary.releaseGap)}</span>
            </div>
          </div>
        </div>

        <div
          role={onInspect ? "button" : undefined}
          tabIndex={onInspect ? 0 : undefined}
          onClick={onInspect}
          onKeyDown={(event) => {
            if (onInspect && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              onInspect();
            }
          }}
          className={cn(
            "rounded-[8px] border border-border bg-background/35 p-4",
            onInspect ? "cursor-pointer transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45" : "",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active workbook</p>
          <div className="mt-4 space-y-2">
            {workbookNames.map((fileName) => (
              <div key={fileName} className="truncate rounded-[8px] border border-border bg-card/60 px-3 py-2 text-xs text-foreground" title={fileName}>
                {fileName}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-[8px] border border-border bg-card/60 p-3">
              <span className="block text-muted-foreground">Period start</span>
              <span className="mt-1 block font-semibold text-foreground">{source?.periodStart ?? "Unknown"}</span>
            </div>
            <div className="rounded-[8px] border border-border bg-card/60 p-3">
              <span className="block text-muted-foreground">Period end</span>
              <span className="mt-1 block font-semibold text-foreground">{source?.periodEnd ?? "Unknown"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function IncomeSettlementPanel() {
  const { data, isLoading, error } = useIncomeDashboardData();
  const [sourceFocus, setSourceFocus] = useState<IncomeSourceFilter>("all");
  const [detail, setDetail] = useState<DashboardDetail | null>(null);

  if (isLoading) {
    return <IncomeDashboardLoading />;
  }

  if (error) {
    return <div className="rounded-[8px] border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{error}</div>;
  }

  if (!data?.hasData) {
    return (
      <div className="animate-fade-in-up space-y-4">
        <ChartCard title="Income & Settlement Dashboard" subtitle="Upload Shopee and TikTok income files to generate released amount reporting">
          <EmptyState />
        </ChartCard>
      </div>
    );
  }

  const activeSource = sourceFocus === "all" ? null : data.sources.find((source) => source.key === sourceFocus) ?? null;
  const activeSourceLabel = activeSource ? compactSourceName(activeSource.source) : "All Sources";
  const filteredSources = sourceFocus === "all" ? data.sources : data.sources.filter((source) => source.key === sourceFocus);
  const filteredSummary = buildFilteredSummary(filteredSources);
  const sourceComparison = data.sourceComparison.filter((source) => sourceFocus === "all" || source.key === sourceFocus);
  const activeSourceName = activeSource?.source ?? null;
  const matchesActiveSource = (source?: string) => sourceFocus === "all" || source === activeSourceName;
  const isGlobalOverview = sourceFocus === "all";
  const isShopeeFocused = sourceFocus === "shopee";
  const isTikTokFocused = sourceFocus === "tiktok1" || sourceFocus === "tiktok2";
  const showShopeeOperational = sourceFocus === "all" || sourceFocus === "shopee";
  const showTikTokOperational = sourceFocus === "all" || sourceFocus === "tiktok1" || sourceFocus === "tiktok2";

  const feeComponents = data.feeComponents.filter((fee) => matchesActiveSource(fee.source));
  const dailyReleased = data.dailyReleased;
  const settlementSourceMix = data.settlementSourceMix.filter((row) => sourceFocus === "all" || row.sourceKey === sourceFocus);
  const topOrders = data.topOrders.filter((row) => matchesActiveSource(row.source));
  const paymentMethods = showShopeeOperational ? data.paymentMethods : [];
  const courierMix = showShopeeOperational ? data.courierMix : [];
  const sellerFeeProducts = showShopeeOperational ? data.sellerFeeProducts : [];
  const adjustments = showShopeeOperational ? data.adjustments : [];
  const shippingDiscrepancies = showShopeeOperational ? data.shippingDiscrepancies : [];
  const withdrawalRecords = showTikTokOperational ? data.withdrawalRecords.filter((row) => matchesActiveSource(row.source)) : [];
  const visibleFeeRows = feeComponents.slice(0, 14).reverse();
  const visibleTopOrderRows = topOrders.slice(0, 12).reverse();
  const visibleCourierRows = courierMix.slice(0, 10).reverse();
  const visibleSellerFeeRows = sellerFeeProducts.slice(0, 10).reverse();

  const sourceFilters = [
    { key: "all" as const, label: "All Sources", color: "#38bdf8" },
    ...data.sources.map((source) => ({ key: source.key as IncomeSourceFilter, label: compactSourceName(source.source), color: source.color })),
  ];

  const reportCoverage = [
    { report: "Filtered Income Summary", coverage: activeSourceLabel, rows: filteredSources.length, purpose: "Filtered release, revenue, fee, order, buyer, adjustment, and withdrawal totals." },
    ...filteredSources.map((source) => ({
      report: `${compactSourceName(source.source)} Source Workbook`,
      coverage: source.fileNames.slice(0, 2).join(", ") || source.source,
      rows: source.rowCount,
      purpose: "Raw income rows currently contributing to the selected settlement source.",
    })),
    ...(showShopeeOperational ? [
      { report: "Shopee Payout Detail", coverage: "Income, Seller Fee, Adjustment, Shipping discrepancy", rows: data.sources.find((source) => source.key === "shopee")?.detailRowCount ?? 0, purpose: "Order-level released amount, payment method, courier, fee, and adjustment diagnostics." },
    ] : []),
    ...(showTikTokOperational ? [
      { report: "TikTok / Tokopedia Settlement Detail", coverage: "Reports, Order details, Withdrawal records", rows: filteredSources.filter((source) => source.key !== "shopee").reduce((sum, source) => sum + source.detailRowCount, 0), purpose: "TikTok Shop and Tokopedia-origin settlement amount, fees, and withdrawal monitoring." },
    ] : []),
  ];

  const incomeSourceKey = (source?: string | null): IncomeSourceFilter | "" => {
    const text = compactSourceName(source ?? "").toLowerCase();
    if (text.includes("shopee")) return "shopee";
    if (text.includes("card")) return "tiktok2";
    if (text.includes("tiktok")) return "tiktok1";
    return "";
  };

  const buildIncomeOrderQuery = (extra: Record<string, string | undefined> = {}) => {
    const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search.slice(1));
    if (sourceFocus !== "all") {
      query.set("channels", sourceFocus);
    } else if (!query.has("channels")) {
      query.set("channels", "shopee,tiktok1,tiktok2");
    }
    query.set("channelGroup", "Marketplace");
    query.set("limit", "100");
    Object.entries(extra).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return query;
  };

  const orderSourceLabel = (order: Pick<IncomeOrderRow, "sourceSystem" | "shopAccount">) => {
    if (order.sourceSystem === "shopee") return "Shopee";
    return compactSourceName(order.shopAccount || "TikTok Shop");
  };

  const openIncomeOrderSkuDetail = async (orderKey: string) => {
    setDetail({
      title: "Loading order detail",
      badge: "SKU-Level Order",
      subtitle: "Preparing SKU-level order detail...",
      note: "Loading order items...",
    });

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderKey)}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<IncomeOrderDetailPayload>;
      if (!payload.ok || !payload.data) throw new Error(payload.error?.message ?? "Failed to load order SKU detail");
      const { order, items, marketplace } = payload.data;

      setDetail({
        badge: "SKU-Level Order",
        title: order.sourceOrderId,
        subtitle: "Order detail with SKU-level item rows from the normalized dataset.",
        metrics: [
          { label: "Booked GMV", value: formatIDR(Number(order.bookedOrderGmv ?? 0)), accent: "#38bdf8" },
          { label: "Active GMV", value: formatIDR(Number(order.activeOrderGmv ?? 0)), accent: "#10b981" },
          { label: "Refund", value: formatIDR(Number(order.orderRefundAmount ?? marketplace?.refundAmount ?? 0)), accent: "#ef4444" },
          { label: "Items", value: formatNumber(items.length), accent: "#ec4899" },
        ],
        rows: [
          { label: "Source", value: compactSourceName(order.shopAccount || order.sourceSystem) },
          { label: "Status", value: order.normalizedStatus },
          { label: "Order Date", value: order.orderCreatedAt ? String(order.orderCreatedAt).slice(0, 10) : "-" },
          { label: "Payment Method", value: order.paymentMethod ?? "-" },
          { label: "Marketplace Status", value: marketplace?.marketplaceStatusRaw ?? "-" },
          { label: "Fulfillment", value: marketplace?.fulfillmentStatusRaw ?? "-" },
          { label: "Logistics", value: marketplace?.logisticsProvider ?? "-" },
          { label: "Tracking Number", value: marketplace?.trackingNumber ?? "-" },
          { label: "Cancellation Reason", value: marketplace?.cancellationReason ?? "-" },
        ],
        table: {
          columns: ["SKU", "Product", "Qty", "Unit Price", "Line GMV", "Type"],
          rows: items.map((item) => [
            item.sourceSkuCode || "-",
            item.sourceProductName || "-",
            formatNumber(Number(item.quantity ?? 0)),
            formatIDR(Number(item.unitDiscountedPrice ?? 0)),
            formatIDR(Number(item.lineGmv ?? 0)),
            item.skuType || "-",
          ]),
        },
      });
    } catch (error) {
      setDetail({
        title: "Order detail unavailable",
        badge: "SKU-Level Order",
        subtitle: orderKey,
        note: error instanceof Error ? error.message : "Failed to load order SKU detail.",
      });
    }
  };

  const incomeOrderButton = (order: IncomeOrderRow) => (
    <button
      type="button"
      onClick={() => void openIncomeOrderSkuDetail(order.orderKey)}
      className="inline-flex min-h-8 max-w-[220px] items-center rounded-[6px] border border-primary/25 bg-primary/10 px-2.5 py-1 text-left text-xs font-bold text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      title="Open SKU-level detail"
    >
      <span className="truncate">{order.sourceOrderId}</span>
    </button>
  );

  const incomeOrderListTable = (orders: IncomeOrderRow[]) => ({
    columns: ["Order", "Source", "Status", "City", "Booked GMV", "Active GMV"],
    rows: orders.map((order) => [
      incomeOrderButton(order),
      orderSourceLabel(order),
      order.normalizedStatus,
      order.city ?? "-",
      formatIDR(Number(order.bookedOrderGmv ?? 0)),
      formatIDR(Number(order.activeOrderGmv ?? 0)),
    ]),
  });

  const fetchIncomeOrders = async (extra: Record<string, string | undefined> = {}) => {
    const response = await fetch(`/api/orders?${buildIncomeOrderQuery(extra).toString()}`, { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<{ orders: IncomeOrderRow[] }>;
    if (!payload.ok || !payload.data) throw new Error(payload.error?.message ?? "Failed to load order detail");
    return payload.data.orders;
  };

  const openIncomeOrderListDetail = async ({
    title,
    subtitle,
    badge,
    metrics,
    rows,
    extra,
  }: {
    title: string;
    subtitle: string;
    badge: string;
    metrics?: DashboardDetail["metrics"];
    rows?: DashboardDetail["rows"];
    extra?: Record<string, string | undefined>;
  }) => {
    setDetail({ title, subtitle, badge, metrics, rows, note: "Loading matching orders..." });

    try {
      const orders = await fetchIncomeOrders(extra);
      setDetail({
        title,
        subtitle,
        badge,
        metrics: [
          ...(metrics ?? []),
          { label: "Loaded Orders", value: formatNumber(orders.length), helper: "Maximum 100 rows shown. Click an order number for SKU-level detail.", accent: "#38bdf8" },
        ],
        rows,
        table: orders.length ? incomeOrderListTable(orders) : undefined,
        note: orders.length ? "Click any order number in the table to open SKU-level detail for that order." : "No matching orders found for this detail context.",
      });
    } catch (error) {
      setDetail({
        title,
        subtitle,
        badge,
        metrics,
        rows,
        note: error instanceof Error ? error.message : "Failed to load matching orders.",
      });
    }
  };

  const openSettlementMetricDetail = (label: string, value: string, helper: string) => {
    void openIncomeOrderListDetail({
      title: label,
      subtitle: `Order list behind ${label} for the active Settlement Control Tower filter: ${activeSourceLabel}.`,
      badge: "Settlement KPI",
      metrics: [{ label, value, helper, accent: "#38bdf8" }],
      rows: [
        { label: "Filter", value: activeSourceLabel },
        { label: "Released Amount", value: formatIDR(filteredSummary.totalReleased) },
        { label: "Total Revenue", value: formatIDR(filteredSummary.totalRevenue) },
        { label: "Fee Load", value: formatIDR(filteredSummary.totalFees) },
        { label: "Release Rate", value: percentRate(filteredSummary.releaseRate) },
        { label: "Release Gap", value: formatIDR(filteredSummary.releaseGap) },
      ],
    });
  };

  const openSourceDetail = (source: IncomeDashboard["sources"][number] | undefined, context = "Settlement Source") => {
    if (!source) return;
    void openIncomeOrderListDetail({
      title: compactSourceName(source.source),
      subtitle: "Order list behind this income workbook source. Click an order number to inspect SKU-level detail.",
      badge: context,
      extra: { channels: source.key },
      metrics: [
        { label: "Released Amount", value: formatIDR(source.releasedAmount), accent: source.color },
        { label: "Revenue", value: formatIDR(source.totalRevenue), accent: "#38bdf8" },
        { label: "Fees", value: formatIDR(source.totalFees), helper: `${percentRate(source.feeRate)} fee rate`, accent: "#f59e0b" },
        { label: "Release Rate", value: percentRate(source.releaseRate), accent: "#10b981" },
      ],
      rows: [
        { label: "Source Key", value: source.key },
        { label: "Period", value: `${source.periodStart ?? "Unknown"} - ${source.periodEnd ?? "Unknown"}` },
        { label: "Orders", value: formatNumber(source.orderCount) },
        { label: "Buyers", value: formatNumber(source.buyerCount) },
        { label: "Rows", value: formatNumber(source.rowCount) },
        { label: "Detail Rows", value: formatNumber(source.detailRowCount) },
        { label: "Workbook", value: source.fileNames.join(", ") || "-" },
      ],
    });
  };

  const openFeeDetail = (fee: FeeComponent | undefined) => {
    if (!fee) return;
    void openIncomeOrderListDetail({
      title: fee.name,
      subtitle: `${compactSourceName(fee.source)} deduction component. Related order list is scoped to this source.`,
      badge: "Fee Component",
      extra: { channels: incomeSourceKey(fee.source) || undefined },
      metrics: [
        { label: "Fee Amount", value: formatIDR(fee.value), accent: "#f59e0b" },
        { label: "Absolute Impact", value: formatIDR(fee.absoluteValue), accent: "#ef4444" },
      ],
      rows: [
        { label: "Source", value: compactSourceName(fee.source) },
        { label: "Component", value: fee.name },
      ],
    });
  };

  const openSettlementSourceDetail = (row: SettlementSourceMix | undefined) => {
    if (!row) return;
    void openIncomeOrderListDetail({
      title: row.orderSource,
      subtitle: `${compactSourceName(row.source)} released amount contribution. Click an order number to inspect SKU-level detail.`,
      badge: "Settlement Source Mix",
      extra: { channels: row.sourceKey, purchaseChannel: row.orderSource },
      metrics: [
        { label: "Released Amount", value: formatIDR(row.releasedAmount), accent: settlementSourceColor(row) },
        { label: "Orders", value: formatNumber(row.orders), accent: "#38bdf8" },
      ],
      rows: [
        { label: "Income Source", value: compactSourceName(row.source) },
        { label: "Order Source", value: row.orderSource },
      ],
    });
  };

  const openNamedValueDetail = (title: string, row: NamedValue | undefined, valueLabel = "Amount") => {
    if (!row) return;
    void openIncomeOrderListDetail({
      title: row.name,
      subtitle: `${title} detail scoped to ${activeSourceLabel}. Click an order number to inspect SKU-level detail.`,
      badge: valueLabel,
      extra: { channels: incomeSourceKey(row.source ?? activeSourceName) || undefined },
      metrics: [{ label: valueLabel, value: formatIDR(row.value), accent: sourceColor(row.source ?? activeSourceName ?? "") }],
      rows: [
        { label: "Source", value: row.source ? compactSourceName(row.source) : activeSourceLabel },
        { label: "Name", value: row.name },
      ],
    });
  };

  const openTopOrderDetail = (row: IncomeDashboard["topOrders"][number] | undefined) => {
    if (!row) return;
    void openIncomeOrderListDetail({
      title: row.orderId,
      subtitle: "Order-level released amount detail from the selected income workbook. Click the order number to inspect SKU-level detail.",
      badge: "Income Order",
      extra: { channels: incomeSourceKey(row.source) || undefined, sourceOrderId: row.orderId },
      metrics: [{ label: "Released Amount", value: formatIDR(row.releasedAmount), accent: sourceColor(row.source) }],
      rows: [
        { label: "Source", value: compactSourceName(row.source) },
        { label: "Buyer", value: row.buyer || "-" },
        { label: "Date", value: row.date ?? "-" },
      ],
    });
  };

  const openDailyReleasedDetail = (row: IncomeDashboard["dailyReleased"][number] | undefined) => {
    if (!row) return;
    void openIncomeOrderListDetail({
      title: String(row.date),
      subtitle: `Order list behind released amount movement for ${activeSourceLabel}. Click an order number to inspect SKU-level detail.`,
      badge: "Daily Settlement",
      extra: { start: String(row.date), end: String(row.date) },
      metrics: [
        { label: "Shopee", value: formatIDR(Number(row.shopee ?? 0)), accent: "#f97316" },
        { label: "TikTok ID", value: formatIDR(Number(row.tiktok1 ?? 0)), accent: "#ef4444" },
        { label: "TikTok Card", value: formatIDR(Number(row.tiktok2 ?? 0)), accent: "#ec4899" },
      ],
    });
  };

  const openReportDetail = (report: (typeof reportCoverage)[number]) => {
    setDetail({
      badge: "Report Coverage",
      title: report.report,
      subtitle: report.purpose,
      metrics: [{ label: "Rows", value: formatNumber(report.rows), accent: "#38bdf8" }],
      rows: [
        { label: "Coverage", value: report.coverage },
        { label: "Active Filter", value: activeSourceLabel },
      ],
    });
  };

  const openAdjustmentDetail = (row: IncomeDashboard["adjustments"][number] | undefined) => {
    if (!row) return;
    void openIncomeOrderListDetail({
      title: row.type || row.reason || row.orderId || "Adjustment",
      subtitle: "Manual compensation or linked order adjustment detail. Click the order number to inspect SKU-level detail.",
      badge: "Adjustment",
      extra: { channels: "shopee", sourceOrderId: row.orderId || undefined },
      metrics: [{ label: "Amount", value: formatIDR(row.amount), accent: "#ec4899" }],
      rows: [
        { label: "Date", value: row.date ?? "-" },
        { label: "Order", value: row.orderId || "-" },
        { label: "Reason", value: row.reason || "-" },
      ],
    });
  };

  const openShippingDetail = (row: IncomeDashboard["shippingDiscrepancies"][number] | undefined) => {
    if (!row) return;
    void openIncomeOrderListDetail({
      title: row.orderId,
      subtitle: "Expected vs actual Shopee logistic charge variance. Click the order number to inspect SKU-level detail.",
      badge: "Shipping Discrepancy",
      extra: { channels: "shopee", sourceOrderId: row.orderId },
      metrics: [
        { label: "Expected", value: formatIDR(row.expectedFee), accent: "#38bdf8" },
        { label: "Actual", value: formatIDR(row.actualFee), accent: "#f59e0b" },
        { label: "Variance", value: formatIDR(row.variance), accent: "#ef4444" },
      ],
    });
  };

  const openWithdrawalDetail = (row: IncomeDashboard["withdrawalRecords"][number] | undefined) => {
    if (!row) return;
    setDetail({
      badge: "Withdrawal",
      title: row.referenceId || row.type,
      subtitle: "TikTok withdrawal and earnings record detail.",
      metrics: [{ label: "Amount", value: formatIDR(row.amount), accent: "#10b981" }],
      rows: [
        { label: "Source", value: compactSourceName(row.source) },
        { label: "Type", value: row.type },
        { label: "Request Time", value: row.requestTime ?? "-" },
        { label: "Status", value: row.status },
      ],
    });
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <section className="relative overflow-hidden rounded-[8px] border border-border bg-card">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-300 via-cyan-300 to-orange-300" />
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_470px] lg:p-6">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              <Landmark className="h-3.5 w-3.5" />
              Settlement Control Tower
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Financial Settlement Control Center</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
              Premium reconciliation workspace for released amount, revenue, fee load, payout movement, operational deductions, withdrawal records, and settlement source visibility across Shopee, TikTok Shop, and Tokopedia-origin orders.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {sourceFilters.map((filter) => {
              const isActive = sourceFocus === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setSourceFocus(filter.key)}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2.5 text-left transition-all duration-300 hover:-translate-y-0.5",
                    isActive ? "bg-background text-foreground shadow-sm" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                  style={{ borderColor: isActive ? filter.color : undefined }}
                >
                  <span className="min-w-0 truncate text-xs font-semibold">{filter.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {isGlobalOverview ? (
        <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SettlementTile label="Released Amount" value={abbreviateIDR(filteredSummary.totalReleased)} helper={`${activeSourceLabel} net payment released`} icon={<Wallet className="h-4 w-4" />} accent="#10b981" onClick={() => openSettlementMetricDetail("Released Amount", formatIDR(filteredSummary.totalReleased), `${activeSourceLabel} net payment released`)} />
        <SettlementTile label="Total Revenue" value={abbreviateIDR(filteredSummary.totalRevenue)} helper="Income-file revenue baseline" icon={<Banknote className="h-4 w-4" />} accent="#38bdf8" onClick={() => openSettlementMetricDetail("Total Revenue", formatIDR(filteredSummary.totalRevenue), "Income-file revenue baseline")} />
        <SettlementTile label="Fees / Expenses" value={abbreviateIDR(Math.abs(filteredSummary.totalFees))} helper={`${percentRate(filteredSummary.feeRate)} fee intensity`} icon={<ReceiptText className="h-4 w-4" />} accent="#f59e0b" onClick={() => openSettlementMetricDetail("Fees / Expenses", formatIDR(filteredSummary.totalFees), `${percentRate(filteredSummary.feeRate)} fee intensity`)} />
        <SettlementTile label="Release Rate" value={percentRate(filteredSummary.releaseRate)} helper="Released amount divided by revenue" icon={<Percent className="h-4 w-4" />} accent="#06b6d4" onClick={() => openSettlementMetricDetail("Release Rate", percentRate(filteredSummary.releaseRate), "Released amount divided by revenue")} />
        <SettlementTile label="Settled Orders" value={formatNumber(filteredSummary.totalOrders)} helper={`${formatNumber(filteredSummary.totalBuyers)} buyers in filter`} icon={<FileSpreadsheet className="h-4 w-4" />} accent="#ec4899" onClick={() => openSettlementMetricDetail("Settled Orders", formatNumber(filteredSummary.totalOrders), `${formatNumber(filteredSummary.totalBuyers)} buyers in filter`)} />
        <SettlementTile label="Adjustments" value={abbreviateIDR(filteredSummary.totalAdjustments)} helper={`${abbreviateIDR(filteredSummary.totalWithdrawals)} withdrawals tracked`} icon={<Scale className="h-4 w-4" />} accent="#fb7185" onClick={() => openSettlementMetricDetail("Adjustments", formatIDR(filteredSummary.totalAdjustments), `${formatIDR(filteredSummary.totalWithdrawals)} withdrawals tracked`)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <QualityPanel summary={filteredSummary} sourceCount={filteredSources.length} onClick={() => openSettlementMetricDetail("Reconciliation State", percentRate(filteredSummary.releaseRate), "Release quality, fee intensity, and withdrawal state for the active filter")} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSources.map((source) => {
            const feeRate = Math.abs(source.feeRate) * 100;
            const releaseRate = source.releaseRate * 100;
            return (
              <div
                key={source.key}
                role="button"
                tabIndex={0}
                onClick={() => openSourceDetail(source, "Source Workbook")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openSourceDetail(source, "Source Workbook");
                  }
                }}
                className="group cursor-pointer rounded-[8px] border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{compactSourceName(source.source)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{source.periodStart ?? "Unknown"} - {source.periodEnd ?? "Unknown"}</p>
                  </div>
                  <span className="h-3 w-3 shrink-0 rounded-full shadow-lg" style={{ backgroundColor: source.color, boxShadow: `0 0 20px ${source.color}66` }} />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Released</span><span className="font-semibold text-foreground">{formatIDR(source.releasedAmount)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Revenue</span><span className="text-foreground">{formatIDR(source.totalRevenue)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Fees</span><span className="text-amber-300">{formatIDR(source.totalFees)}</span></div>
                  <div className="grid gap-2 pt-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Release rate</span><span className="font-semibold text-foreground">{releaseRate.toFixed(1)}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(100, releaseRate)}%`, backgroundColor: source.color }} /></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fee rate</span><span className="font-semibold text-foreground">{feeRate.toFixed(1)}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.min(100, feeRate)}%` }} /></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Filtered Income P&L" subtitle={`Revenue, released amount, and fee load for ${activeSourceLabel}`}>
          {sourceComparison.length ? (
            <EChart
              option={getMarketplacePnlOption(sourceComparison)}
              style={{ height: 360 }}
              onClick={(params) => {
                const p = params as IncomeChartClickParams;
                const row = sourceComparison.find((source) => compactSourceName(source.source) === p.name);
                openSourceDetail(filteredSources.find((source) => source.key === row?.key), p.seriesName ?? "Filtered Income P&L");
              }}
            />
          ) : <EmptyState label="No filtered P&L data available." />}
        </ChartCard>
        <ChartCard title="Reconciliation Bridge" subtitle="Revenue, fee pressure, adjustments, released amount, and release gap">
          <EChart option={getCashBridgeOption(filteredSummary)} style={{ height: 360 }} onClick={(params) => openSettlementMetricDetail((params as IncomeChartClickParams).name ?? "Reconciliation Bridge", formatIDR(Number((params as IncomeChartClickParams).value ?? 0)), "Revenue to released amount bridge component")} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Daily Released Trend" subtitle={`Settlement date trend synchronized to ${activeSourceLabel}`}>
          {dailyReleased.length ? <EChart option={getDailyReleasedOption(dailyReleased, sourceFocus)} style={{ height: 420 }} onClick={(params) => openDailyReleasedDetail(dailyReleased[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No daily settlement detail available." />}
        </ChartCard>
        <ChartCard title="Release Rate vs Fee Rate" subtitle="Settlement quality and expense intensity by filtered source">
          {sourceComparison.length ? <EChart option={getRateOption(sourceComparison)} style={{ height: 420 }} onClick={(params) => openSourceDetail(filteredSources.find((source) => compactSourceName(source.source) === (params as IncomeChartClickParams).name), (params as IncomeChartClickParams).seriesName ?? "Release Rate vs Fee Rate")} /> : <EmptyState label="No filtered rate data available." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <ChartCard title="Fee & Expense Components" subtitle={`Largest deductions currently visible in ${activeSourceLabel}`}>
          {feeComponents.length ? <EChart option={getFeeBreakdownOption(feeComponents)} style={{ height: 420 }} onClick={(params) => openFeeDetail(visibleFeeRows[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No fee components available for this filter." />}
        </ChartCard>
        <ChartCard title="Settlement Source Mix" subtitle="Shopee, TikTok Shop, and Tokopedia-origin released amount">
          {settlementSourceMix.length ? <EChart option={getSettlementSourceOption(settlementSourceMix)} style={{ height: 420 }} onClick={(params) => openSettlementSourceDetail(settlementSourceMix[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No settlement source mix available for this filter." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Payment Method Mix" subtitle="Shopee income detail only, synchronized with active source filter">
          {paymentMethods.length ? <EChart option={getDonutOption(paymentMethods, "Payment Method")} style={{ height: 340 }} onClick={(params) => openNamedValueDetail("Payment Method Mix", paymentMethods[(params as IncomeChartClickParams).dataIndex ?? -1], "Released Amount")} /> : <EmptyState label="No Shopee payment method data in this filter." />}
        </ChartCard>
        <ChartCard title="Courier Release Mix" subtitle="Shopee released amount by courier / shipping provider">
          {courierMix.length ? <EChart option={getNamedBarOption(courierMix, "Released Amount")} style={{ height: 340 }} onClick={(params) => openNamedValueDetail("Courier Release Mix", visibleCourierRows[(params as IncomeChartClickParams).dataIndex ?? -1], "Released Amount")} /> : <EmptyState label="No Shopee courier data in this filter." />}
        </ChartCard>
        <ChartCard title="Top Released Orders" subtitle={`Largest order-level releases for ${activeSourceLabel}`}>
          {topOrders.length ? <EChart option={getTopOrdersOption(topOrders)} style={{ height: 340 }} onClick={(params) => openTopOrderDetail(visibleTopOrderRows[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No order-level release rows available for this filter." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Seller Fee by Product" subtitle="Shopee SKU-level processing and promo fee concentration">
          {sellerFeeProducts.length ? (
            <EChart
              option={getNamedBarOption(
                sellerFeeProducts.map((row) => ({ name: row.productName, value: row.feeAmount, source: row.source })),
                "Seller Fee",
              )}
              style={{ height: 390 }}
              onClick={(params) => {
                const row = visibleSellerFeeRows[(params as IncomeChartClickParams).dataIndex ?? -1];
                openNamedValueDetail("Seller Fee by Product", row ? { name: row.productName, value: row.feeAmount, source: row.source } : undefined, "Seller Fee");
              }}
            />
          ) : <EmptyState label="No Shopee Seller Fee rows in this filter." />}
        </ChartCard>
        <ChartCard title="Filtered Report Coverage" subtitle="Every listed report is scoped to the active Settlement Control Tower filter">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Report</th>
                  <th className="pb-3 pr-4">Coverage</th>
                  <th className="pb-3 pr-4 text-right">Rows</th>
                  <th className="pb-3">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {reportCoverage.map((report) => (
                  <tr key={`${report.report}-${report.coverage}`} onClick={() => openReportDetail(report)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                    <td className="py-3 pr-4 font-medium text-foreground">{report.report}</td>
                    <td className="max-w-[220px] truncate py-3 pr-4 text-muted-foreground" title={report.coverage}>{report.coverage}</td>
                    <td className="py-3 pr-4 text-right text-foreground">{formatNumber(report.rows)}</td>
                    <td className="py-3 text-muted-foreground">{report.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Adjustment Register" subtitle="Manual compensation and linked order adjustments">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.slice(0, 10).map((row, index) => (
                  <tr key={`${row.orderId}-${index}`} onClick={() => openAdjustmentDetail(row)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                    <td className="py-3 pr-4 text-muted-foreground">{row.date ?? "-"}</td>
                    <td className="max-w-[260px] truncate py-3 pr-4 text-foreground" title={row.reason || row.type}>{row.type || row.reason}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.orderId || "-"}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{formatIDR(row.amount)}</td>
                  </tr>
                ))}
                {!adjustments.length && <tr><td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No adjustments found for this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Shipping Fee Discrepancy" subtitle="Actual logistic charge variance vs expected fee">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Order ID</th>
                  <th className="pb-3 pr-4 text-right">Expected</th>
                  <th className="pb-3 pr-4 text-right">Actual</th>
                  <th className="pb-3 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {shippingDiscrepancies.slice(0, 10).map((row) => (
                  <tr key={row.orderId} onClick={() => openShippingDetail(row)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                    <td className="py-3 pr-4 font-medium text-foreground">{row.orderId}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatIDR(row.expectedFee)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatIDR(row.actualFee)}</td>
                    <td className="py-3 text-right font-semibold text-amber-300">{formatIDR(row.variance)}</td>
                  </tr>
                ))}
                {!shippingDiscrepancies.length && <tr><td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No shipping discrepancies found for this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Withdrawal Records" subtitle="TikTok withdrawal and earnings records from filtered income workbooks">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Request</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalRecords.map((row) => (
                  <tr key={`${row.source}-${row.referenceId}`} onClick={() => openWithdrawalDetail(row)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                    <td className="py-3 pr-4 text-foreground">{compactSourceName(row.source)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.type}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.requestTime ?? "-"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.status}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{formatIDR(row.amount)}</td>
                  </tr>
                ))}
                {!withdrawalRecords.length && <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No withdrawal records available for this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Top Income Orders" subtitle="Detailed released amount table scoped to active source">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4">Buyer</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 text-right">Released</th>
                </tr>
              </thead>
              <tbody>
                {topOrders.slice(0, 12).map((row) => (
                  <tr key={`${row.source}-${row.orderId}`} onClick={() => openTopOrderDetail(row)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                    <td className="py-3 pr-4 font-medium text-foreground">{row.orderId}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{compactSourceName(row.source)}</td>
                    <td className="max-w-[160px] truncate py-3 pr-4 text-muted-foreground">{row.buyer || "-"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.date ?? "-"}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{formatIDR(row.releasedAmount)}</td>
                  </tr>
                ))}
                {!topOrders.length && <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No released order rows available for this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
        </>
      ) : (
        <>
      <SourceFocusHero source={activeSource} summary={filteredSummary} sourceLabel={activeSourceLabel} isShopeeFocused={isShopeeFocused} onInspect={() => openSourceDetail(activeSource ?? undefined, "Active Workbook")} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SettlementTile label="Released Amount" value={abbreviateIDR(filteredSummary.totalReleased)} helper={`${activeSourceLabel} net payment released`} icon={<Wallet className="h-4 w-4" />} accent={activeSource?.color ?? "#10b981"} onClick={() => openSettlementMetricDetail("Released Amount", formatIDR(filteredSummary.totalReleased), `${activeSourceLabel} net payment released`)} />
        <SettlementTile label="Income Revenue" value={abbreviateIDR(filteredSummary.totalRevenue)} helper="Revenue baseline from the selected source workbook" icon={<Banknote className="h-4 w-4" />} accent="#38bdf8" onClick={() => openSettlementMetricDetail("Income Revenue", formatIDR(filteredSummary.totalRevenue), "Revenue baseline from the selected source workbook")} />
        <SettlementTile label="Fee Load" value={abbreviateIDR(Math.abs(filteredSummary.totalFees))} helper={`${percentRate(filteredSummary.feeRate)} of selected source revenue`} icon={<ReceiptText className="h-4 w-4" />} accent="#f59e0b" onClick={() => openSettlementMetricDetail("Fee Load", formatIDR(filteredSummary.totalFees), `${percentRate(filteredSummary.feeRate)} of selected source revenue`)} />
        <SettlementTile label={isTikTokFocused ? "Withdrawals" : "Adjustments"} value={isTikTokFocused ? abbreviateIDR(filteredSummary.totalWithdrawals) : abbreviateIDR(filteredSummary.totalAdjustments)} helper={isTikTokFocused ? "Withdrawal movement inside selected TikTok workbook" : "Shopee adjustment impact inside selected workbook"} icon={<Scale className="h-4 w-4" />} accent="#ec4899" onClick={() => openSettlementMetricDetail(isTikTokFocused ? "Withdrawals" : "Adjustments", isTikTokFocused ? formatIDR(filteredSummary.totalWithdrawals) : formatIDR(filteredSummary.totalAdjustments), isTikTokFocused ? "Withdrawal movement inside selected TikTok workbook" : "Shopee adjustment impact inside selected workbook")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <ChartCard title={`${activeSourceLabel} Reconciliation Bridge`} subtitle="Focused revenue to released amount movement for the selected marketplace source">
          <EChart option={getCashBridgeOption(filteredSummary)} style={{ height: 430 }} onClick={(params) => openSettlementMetricDetail((params as IncomeChartClickParams).name ?? "Reconciliation Bridge", formatIDR(Number((params as IncomeChartClickParams).value ?? 0)), "Revenue to released amount bridge component")} />
        </ChartCard>
        <QualityPanel summary={filteredSummary} sourceCount={filteredSources.length} onClick={() => openSettlementMetricDetail("Reconciliation State", percentRate(filteredSummary.releaseRate), "Release quality, fee intensity, and withdrawal state for the active filter")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartCard title={`${activeSourceLabel} Daily Released Trend`} subtitle="Settlement date movement for the selected marketplace source only">
          {dailyReleased.length ? <EChart option={getDailyReleasedOption(dailyReleased, sourceFocus)} style={{ height: 430 }} onClick={(params) => openDailyReleasedDetail(dailyReleased[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No daily settlement detail available for this source." />}
        </ChartCard>
        <ChartCard title={`${activeSourceLabel} Fee & Expense Components`} subtitle="Deduction structure ranked by financial impact">
          {feeComponents.length ? <EChart option={getFeeBreakdownOption(feeComponents)} style={{ height: 430 }} onClick={(params) => openFeeDetail(visibleFeeRows[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No fee components available for this source." />}
        </ChartCard>
      </div>

      {isShopeeFocused ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
            <ChartCard title="Shopee Payment Method Mix" subtitle="Released amount concentration by buyer payment method">
              {paymentMethods.length ? <EChart option={getDonutOption(paymentMethods, "Payment Method")} style={{ height: 360 }} onClick={(params) => openNamedValueDetail("Shopee Payment Method Mix", paymentMethods[(params as IncomeChartClickParams).dataIndex ?? -1], "Released Amount")} /> : <EmptyState label="No Shopee payment method data in this source." />}
            </ChartCard>
            <ChartCard title="Shopee Courier Release Mix" subtitle="Released amount by shipping provider">
              {courierMix.length ? <EChart option={getNamedBarOption(courierMix, "Released Amount")} style={{ height: 360 }} onClick={(params) => openNamedValueDetail("Shopee Courier Release Mix", visibleCourierRows[(params as IncomeChartClickParams).dataIndex ?? -1], "Released Amount")} /> : <EmptyState label="No Shopee courier data in this source." />}
            </ChartCard>
            <ChartCard title="Shopee Seller Fee by Product" subtitle="SKU-level processing, promo, and commission fee concentration">
              {sellerFeeProducts.length ? (
                <EChart
                  option={getNamedBarOption(
                    sellerFeeProducts.map((row) => ({ name: row.productName, value: row.feeAmount, source: row.source })),
                    "Seller Fee",
                  )}
                  style={{ height: 360 }}
                  onClick={(params) => {
                    const row = visibleSellerFeeRows[(params as IncomeChartClickParams).dataIndex ?? -1];
                    openNamedValueDetail("Shopee Seller Fee by Product", row ? { name: row.productName, value: row.feeAmount, source: row.source } : undefined, "Seller Fee");
                  }}
                />
              ) : <EmptyState label="No Shopee Seller Fee rows in this source." />}
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <ChartCard title="Shopee Adjustment Register" subtitle="Manual compensation and linked order adjustments">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Order</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.slice(0, 10).map((row, index) => (
                      <tr key={`${row.orderId}-${index}`} onClick={() => openAdjustmentDetail(row)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                        <td className="py-3 pr-4 text-muted-foreground">{row.date ?? "-"}</td>
                        <td className="max-w-[260px] truncate py-3 pr-4 text-foreground" title={row.reason || row.type}>{row.type || row.reason}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{row.orderId || "-"}</td>
                        <td className="py-3 text-right font-semibold text-foreground">{formatIDR(row.amount)}</td>
                      </tr>
                    ))}
                    {!adjustments.length && <tr><td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No adjustments found for this source.</td></tr>}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard title="Shopee Shipping Fee Discrepancy" subtitle="Actual logistic charge variance vs expected fee">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Order ID</th>
                      <th className="pb-3 pr-4 text-right">Expected</th>
                      <th className="pb-3 pr-4 text-right">Actual</th>
                      <th className="pb-3 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingDiscrepancies.slice(0, 10).map((row) => (
                      <tr key={row.orderId} onClick={() => openShippingDetail(row)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                        <td className="py-3 pr-4 font-medium text-foreground">{row.orderId}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{formatIDR(row.expectedFee)}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{formatIDR(row.actualFee)}</td>
                        <td className="py-3 text-right font-semibold text-amber-300">{formatIDR(row.variance)}</td>
                      </tr>
                    ))}
                    {!shippingDiscrepancies.length && <tr><td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No shipping discrepancies found for this source.</td></tr>}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
            <ChartCard title="Shopee Settlement Source" subtitle="Source-level released amount contribution">
              {settlementSourceMix.length ? <EChart option={getSettlementSourceOption(settlementSourceMix)} style={{ height: 360 }} onClick={(params) => openSettlementSourceDetail(settlementSourceMix[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No Shopee settlement source rows available." />}
            </ChartCard>
            <ChartCard title="Shopee Top Income Orders" subtitle="Largest released amount orders from the selected Shopee income workbook">
              {topOrders.length ? <EChart option={getTopOrdersOption(topOrders)} style={{ height: 360 }} onClick={(params) => openTopOrderDetail(visibleTopOrderRows[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No order-level release rows available for Shopee." />}
            </ChartCard>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <ChartCard title={`${activeSourceLabel} Settlement Source Mix`} subtitle="TikTok Shop and Tokopedia-origin released amount inside the selected income workbook">
              {settlementSourceMix.length ? <EChart option={getSettlementSourceOption(settlementSourceMix)} style={{ height: 390 }} onClick={(params) => openSettlementSourceDetail(settlementSourceMix[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No settlement source mix available for this TikTok source." />}
            </ChartCard>
            <ChartCard title={`${activeSourceLabel} Withdrawal Records`} subtitle="Withdrawal and earnings records scoped to the selected TikTok source">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Request</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRecords.map((row) => (
                      <tr key={`${row.source}-${row.referenceId}`} onClick={() => openWithdrawalDetail(row)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                        <td className="py-3 pr-4 text-foreground">{row.type}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{row.requestTime ?? "-"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{row.status}</td>
                        <td className="py-3 text-right font-semibold text-foreground">{formatIDR(row.amount)}</td>
                      </tr>
                    ))}
                    {!withdrawalRecords.length && <tr><td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No withdrawal records available for this TikTok source.</td></tr>}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <ChartCard title={`${activeSourceLabel} Top Released Orders`} subtitle="Largest order-level releases from the selected income workbook">
              {topOrders.length ? <EChart option={getTopOrdersOption(topOrders)} style={{ height: 390 }} onClick={(params) => openTopOrderDetail(visibleTopOrderRows[(params as IncomeChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No order-level release rows available for this TikTok source." />}
            </ChartCard>
            <ChartCard title={`${activeSourceLabel} Financial Footprint`} subtitle="Operational totals that define this settlement source">
              <div className="grid gap-3 sm:grid-cols-2">
                <div role="button" tabIndex={0} onClick={() => openSettlementMetricDetail("Orders", formatNumber(filteredSummary.totalOrders), "Orders inside the active settlement source")} className="cursor-pointer rounded-[8px] border border-border bg-background/35 p-4 transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45">
                  <span className="text-xs text-muted-foreground">Orders</span>
                  <span className="mt-2 block text-2xl font-bold text-foreground">{formatNumber(filteredSummary.totalOrders)}</span>
                </div>
                <div role="button" tabIndex={0} onClick={() => openSettlementMetricDetail("Buyers", formatNumber(filteredSummary.totalBuyers), "Buyers inside the active settlement source")} className="cursor-pointer rounded-[8px] border border-border bg-background/35 p-4 transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45">
                  <span className="text-xs text-muted-foreground">Buyers</span>
                  <span className="mt-2 block text-2xl font-bold text-foreground">{formatNumber(filteredSummary.totalBuyers)}</span>
                </div>
                <div role="button" tabIndex={0} onClick={() => openSettlementMetricDetail("Adjustments", formatIDR(filteredSummary.totalAdjustments), "Adjustments inside the active settlement source")} className="cursor-pointer rounded-[8px] border border-border bg-background/35 p-4 transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45">
                  <span className="text-xs text-muted-foreground">Adjustments</span>
                  <span className="mt-2 block text-2xl font-bold text-foreground">{abbreviateIDR(filteredSummary.totalAdjustments)}</span>
                </div>
                <div role="button" tabIndex={0} onClick={() => openSettlementMetricDetail("Release gap", formatIDR(filteredSummary.releaseGap), "Revenue minus released amount gap")} className="cursor-pointer rounded-[8px] border border-border bg-background/35 p-4 transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45">
                  <span className="text-xs text-muted-foreground">Release gap</span>
                  <span className="mt-2 block text-2xl font-bold text-foreground">{abbreviateIDR(filteredSummary.releaseGap)}</span>
                </div>
              </div>
            </ChartCard>
          </div>
        </>
      )}

      <ChartCard title={`${activeSourceLabel} Report Coverage`} subtitle="Every listed report is scoped to the selected marketplace source">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Report</th>
                <th className="pb-3 pr-4">Coverage</th>
                <th className="pb-3 pr-4 text-right">Rows</th>
                <th className="pb-3">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {reportCoverage.map((report) => (
                <tr key={`${report.report}-${report.coverage}`} onClick={() => openReportDetail(report)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                  <td className="py-3 pr-4 font-medium text-foreground">{report.report}</td>
                  <td className="max-w-[220px] truncate py-3 pr-4 text-muted-foreground" title={report.coverage}>{report.coverage}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatNumber(report.rows)}</td>
                  <td className="py-3 text-muted-foreground">{report.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
        </>
      )}

      <div className="rounded-[8px] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            All KPI cards, charts, operational tables, source mix, and report coverage in this control center are calculated from the active Settlement Control Tower filter: <span className="font-semibold text-foreground">{activeSourceLabel}</span>.
          </p>
        </div>
      </div>

      {sourceFocus !== "all" && !filteredSources.length && (
        <div className="rounded-[8px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>No uploaded income workbook is currently available for this source filter.</p>
          </div>
        </div>
      )}
      <DashboardDetailDialog detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export default function IncomeDashboardPage() {
  return <IncomeSettlementPanel />;
}
