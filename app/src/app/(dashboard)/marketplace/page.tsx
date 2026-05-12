'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Layers3,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';

import { EChart } from '@/components/charts/echart';
import { DashboardDetailDialog, type DashboardDetail } from '@/components/ui/dashboard-detail-dialog';
import { ChartCard } from '@/components/ui/chart-card';
import { mergeChartOptions } from '@/lib/chart-config';
import {
  useDashboardData,
  type ChannelSummary,
  type DailyGMVPoint,
  type MarketplacePurchaseChannelSummary,
  type RecentOrderSummary,
  type SkuSummary,
  type StatusSummary,
} from '@/lib/dashboard-client';
import { abbreviateIDR, formatIDR, formatNumber } from '@/lib/format';
import { chartColors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { IncomeSettlementPanel } from '../income/page';

const marketplaceKeys = new Set(['shopee', 'tiktok1', 'tiktok2']);
type MarketplaceView = 'performance' | 'settlement';
type MarketplaceFocus = 'all' | 'shopee' | 'tiktok1' | 'tiktok2';
type ChartClickParams = { name?: string; seriesName?: string; value?: unknown; dataIndex?: number };
type ApiResponse<T> = { ok: boolean; data?: T; error?: { message?: string } };
type MarketplaceOrderRow = {
  id: string;
  orderKey: string;
  sourceSystem: string;
  shopAccount: string;
  sourceOrderId: string;
  channelGroup: string;
  normalizedStatus: string;
  orderCreatedAt: string | null;
  bookedOrderGmv: number;
  activeOrderGmv: number;
  orderRefundAmount: number;
  province: string | null;
  city: string | null;
  regionalManager?: string | null;
  areaManager?: string | null;
};
type MarketplaceOrderItem = {
  sourceSkuCode: string;
  sourceProductName: string | null;
  quantity: number;
  returnedQuantity: number;
  unitOriginalPrice: number;
  unitDiscountedPrice: number;
  lineGrossAmount: number;
  lineGmv: number;
  lineDiscountAmount: number;
  skuType: string;
};
type MarketplaceOrderDetailPayload = {
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
  items: MarketplaceOrderItem[];
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

const marketplaceViews: Array<{ key: MarketplaceView; label: string; description: string; icon: ReactNode }> = [
  { key: 'performance', label: 'Sales Performance', description: 'Demand, lifecycle, SKU, channel mix', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'settlement', label: 'Income & Settlement', description: 'Payment reconciliation, fees, payout', icon: <ReceiptText className="h-4 w-4" /> },
];

const focusOptions: Array<{ key: MarketplaceFocus; label: string; accent: string }> = [
  { key: 'all', label: 'All Sources', accent: '#38bdf8' },
  { key: 'shopee', label: 'Shopee', accent: '#f97316' },
  { key: 'tiktok1', label: 'TikTok ID', accent: '#06b6d4' },
  { key: 'tiktok2', label: 'TikTok Card', accent: '#ec4899' },
];

const lifecycleColors: Record<string, string> = {
  completed: '#10b981',
  shipped: '#38bdf8',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  returned: '#f43f5e',
  refunded: '#fb7185',
  unknown: '#64748b',
};

function marketplaceColor(key: string) {
  return chartColors.channels[key as keyof typeof chartColors.channels] ?? chartColors.primary[0];
}

function compactMarketplaceName(name: string) {
  return name
    .replace('TikTok Shop (Kayou ID)', 'TikTok ID')
    .replace('TikTok Shop (Kayou Card ID)', 'TikTok Card');
}

function sourceKeyFromLabel(label: string) {
  const text = label.toLowerCase();
  if (text.includes('shopee')) return 'shopee';
  if (text.includes('card')) return 'tiktok2';
  if (text.includes('tiktok')) return 'tiktok1';
  return '';
}

function purchaseChannelColor(label: string, fallbackKey?: string) {
  const text = label.toLowerCase();
  if (text.includes('tokopedia')) return '#22c55e';
  if (text.includes('tiktok')) return '#06b6d4';
  if (text.includes('shopee')) return '#f97316';
  return fallbackKey ? marketplaceColor(fallbackKey) : '#38bdf8';
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function skuMarketplaceValue(sku: SkuSummary, focus: MarketplaceFocus) {
  if (focus === 'all') return Number(sku.shopee ?? 0) + Number(sku.tiktok1 ?? 0) + Number(sku.tiktok2 ?? 0);
  return Number(sku[focus] ?? 0);
}

function getDemandComparisonOption(marketplaces: ChannelSummary[]): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 11 } },
    grid: { left: 12, right: 18, top: 18, bottom: 50, containLabel: true },
    xAxis: {
      type: 'category',
      data: marketplaces.map((marketplace) => compactMarketplaceName(marketplace.channel)),
      axisLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: 'rgba(255,255,255,0.52)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        name: 'Booked GMV',
        type: 'bar',
        barWidth: 18,
        data: marketplaces.map((marketplace) => ({
          value: marketplace.bookedGMV,
          itemStyle: { color: marketplaceColor(marketplace.channelKey), borderRadius: [5, 5, 0, 0] },
        })),
      },
      {
        name: 'Active GMV',
        type: 'bar',
        barWidth: 18,
        data: marketplaces.map((marketplace) => ({
          value: marketplace.activeGMV,
          itemStyle: { color: '#10b981', borderRadius: [5, 5, 0, 0] },
        })),
      },
    ],
  });
}

function getDailyDemandOption(daily: DailyGMVPoint[], focus: MarketplaceFocus): EChartsOption {
  const seriesConfig = [
    { key: 'shopee' as const, name: 'Shopee', color: '#f97316' },
    { key: 'tiktok1' as const, name: 'TikTok ID', color: '#06b6d4' },
    { key: 'tiktok2' as const, name: 'TikTok Card', color: '#ec4899' },
  ].filter((item) => focus === 'all' || item.key === focus);

  return mergeChartOptions({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 11 } },
    grid: { left: 12, right: 14, top: 18, bottom: 52, containLabel: true },
    xAxis: {
      type: 'category',
      data: daily.map((day) => day.date.slice(5)),
      axisLabel: { color: 'rgba(255,255,255,0.52)', fontSize: 10, rotate: daily.length > 18 ? 45 : 0 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: 'rgba(255,255,255,0.52)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: seriesConfig.map((series) => ({
      name: series.name,
      type: 'line' as const,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3, color: series.color },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{ offset: 0, color: `${series.color}28` }, { offset: 1, color: `${series.color}03` }],
        },
      },
      data: daily.map((day) => Number(day[series.key] ?? 0)),
    })),
  });
}

function getLifecycleOption(statuses: StatusSummary[], marketplaces: ChannelSummary[]): EChartsOption {
  const sources = marketplaces.map((marketplace) => marketplace.channel);
  const normalizedStatuses = Array.from(new Set(statuses.map((status) => status.status))).sort((a, b) => {
    const order = ['completed', 'shipped', 'pending', 'cancelled', 'returned', 'refunded', 'unknown'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 18, bottom: 54, containLabel: true },
    xAxis: {
      type: 'category',
      data: sources.map(compactMarketplaceName),
      axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: normalizedStatuses.map((status) => ({
      name: status,
      type: 'bar' as const,
      stack: 'orders',
      emphasis: { focus: 'series' as const },
      itemStyle: { color: lifecycleColors[status] ?? lifecycleColors.unknown },
      data: sources.map((source) => statuses.find((row) => row.source === source && row.status === status)?.orders ?? 0),
    })),
  });
}

function getPurchaseChannelOption(rows: MarketplacePurchaseChannelSummary[]): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>${formatIDR(p.value)}<br/>${p.percent.toFixed(1)}% of GMV`;
      },
    },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 11 } },
    series: [{
      name: 'Purchase Channel',
      type: 'pie',
      radius: ['50%', '74%'],
      center: ['50%', '43%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 7, borderColor: 'rgba(2,6,23,0.9)', borderWidth: 3 },
      label: { color: 'rgba(255,255,255,0.74)', formatter: '{d}%', fontWeight: 700, fontSize: 11 },
      data: rows.map((row) => ({
        name: `${row.purchaseChannel} - ${compactMarketplaceName(row.channel)}`,
        value: row.bookedGMV,
        itemStyle: { color: purchaseChannelColor(row.purchaseChannel, row.channelKey) },
      })),
    }],
  });
}

function getSkuLeaderOption(rows: Array<SkuSummary & { marketplaceGMV: number }>): EChartsOption {
  const top = rows.slice(0, 12).reverse();
  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 18, top: 8, bottom: 10, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: 'rgba(255,255,255,0.52)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: top.map((sku) => sku.skuName.length > 28 ? `${sku.skuName.slice(0, 27)}...` : sku.skuName),
      axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 10 },
    },
    series: [{
      name: 'SKU GMV',
      type: 'bar',
      data: top.map((sku, index) => ({
        value: sku.marketplaceGMV,
        itemStyle: { color: index > 8 ? '#f97316' : index > 4 ? '#06b6d4' : '#ec4899', borderRadius: [0, 5, 5, 0] },
      })),
    }],
  });
}

function getRiskScatterOption(marketplaces: ChannelSummary[]): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number, string] };
        return `<strong>${p.data[3]}</strong><br/>AOV: ${formatIDR(p.data[0])}<br/>Cancel Rate: ${p.data[1].toFixed(1)}%<br/>Orders: ${formatNumber(p.data[2])}`;
      },
    },
    grid: { left: 12, right: 18, top: 18, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'AOV',
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: 'rgba(255,255,255,0.52)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      name: 'Cancel Rate',
      axisLabel: { formatter: '{value}%', color: 'rgba(255,255,255,0.52)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [{
      type: 'scatter',
      symbolSize: (point: number[]) => Math.max(22, Math.sqrt(point[2]) * 1.1),
      data: marketplaces.map((marketplace) => [marketplace.aov, marketplace.cancellationRate, marketplace.orders, compactMarketplaceName(marketplace.channel)]),
      itemStyle: {
        color: ((params: { dataIndex: number }) => marketplaceColor(marketplaces[params.dataIndex]?.channelKey ?? 'shopee')) as unknown as string,
        shadowBlur: 16,
        shadowColor: 'rgba(0,0,0,0.35)',
      },
      label: {
        show: true,
        formatter: ((params: { data: [number, number, number, string] }) => params.data[3]) as unknown as string,
        position: 'top',
        color: 'rgba(255,255,255,0.72)',
        fontSize: 10,
      },
    }],
  });
}

function getFocusedDemandOption(marketplace: ChannelSummary): EChartsOption {
  const rows = [
    { name: 'Booked GMV', value: marketplace.bookedGMV, color: marketplaceColor(marketplace.channelKey) },
    { name: 'Active GMV', value: marketplace.activeGMV, color: '#10b981' },
    { name: 'Cancellation Value', value: marketplace.refundAmount, color: '#ef4444' },
  ];

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = params as Array<{ name: string; value: number; marker: string }>;
        return list.map((item) => `${item.marker}${item.name}: <strong>${formatIDR(item.value)}</strong>`).join('<br/>');
      },
    },
    grid: { left: 12, right: 16, top: 20, bottom: 14, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: 'rgba(255,255,255,0.52)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: rows.map((row) => row.name),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    },
    series: [{
      name: compactMarketplaceName(marketplace.channel),
      type: 'bar',
      barWidth: 24,
      data: rows.map((row) => ({
        value: row.value,
        itemStyle: { color: row.color, borderRadius: [0, 6, 6, 0] },
      })),
    }],
  });
}

function getStatusDistributionOption(statuses: StatusSummary[]): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>${formatNumber(p.value)} orders<br/>${p.percent.toFixed(1)}% of source`;
      },
    },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 11 } },
    series: [{
      name: 'Lifecycle',
      type: 'pie',
      radius: ['52%', '76%'],
      center: ['50%', '42%'],
      itemStyle: { borderRadius: 7, borderColor: 'rgba(2,6,23,0.9)', borderWidth: 3 },
      label: { color: 'rgba(255,255,255,0.76)', formatter: '{d}%', fontWeight: 700, fontSize: 11 },
      data: statuses.map((status) => ({
        name: status.status,
        value: status.orders,
        itemStyle: { color: lifecycleColors[status.status] ?? lifecycleColors.unknown },
      })),
    }],
  });
}

function getPurchaseChannelBarOption(rows: MarketplacePurchaseChannelSummary[]): EChartsOption {
  const top = rows.slice(0, 10).reverse();
  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 16, top: 14, bottom: 10, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => abbreviateIDR(value), color: 'rgba(255,255,255,0.52)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: top.map((row) => row.purchaseChannel.length > 26 ? `${row.purchaseChannel.slice(0, 25)}...` : row.purchaseChannel),
      axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 10 },
    },
    series: [{
      name: 'Booked GMV',
      type: 'bar',
      data: top.map((row) => ({
        value: row.bookedGMV,
        itemStyle: { color: purchaseChannelColor(row.purchaseChannel, row.channelKey), borderRadius: [0, 5, 5, 0] },
      })),
    }],
  });
}

function MarketplaceFocusHero({
  marketplace,
  label,
  isShopee,
  onInspect,
}: {
  marketplace?: ChannelSummary;
  label: string;
  isShopee: boolean;
  onInspect?: () => void;
}) {
  const accent = marketplace ? marketplaceColor(marketplace.channelKey) : '#38bdf8';
  const modeDescription = isShopee
    ? 'Shopee demand operations with focused GMV quality, cancellation exposure, SKU concentration, and latest order visibility.'
    : 'TikTok Shop account lens with TikTok/Tokopedia purchase-channel behavior, lifecycle quality, SKU concentration, and latest order visibility.';

  return (
    <section className="relative overflow-hidden rounded-[8px] border border-border bg-card">
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />
      <div className="grid gap-5 p-5 lg:grid-cols-[1.35fr_0.65fr] lg:p-6">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-[8px] border border-border bg-background/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 18px ${accent}` }} />
            Sales Focus Mode
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{label} Sales Command</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {modeDescription} The report structure is rebalanced for this marketplace source instead of using the broad multi-channel comparison layout.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <span className="text-xs text-muted-foreground">Active conversion</span>
              <span className="mt-1 block text-xl font-bold text-foreground">{marketplace ? percent(marketplace.bookedGMV ? (marketplace.activeGMV / marketplace.bookedGMV) * 100 : 0) : '0.0%'}</span>
            </div>
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <span className="text-xs text-muted-foreground">Cancellation rate</span>
              <span className="mt-1 block text-xl font-bold text-foreground">{marketplace ? percent(marketplace.cancellationRate) : '0.0%'}</span>
            </div>
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <span className="text-xs text-muted-foreground">Average order value</span>
              <span className="mt-1 block text-xl font-bold text-foreground">{marketplace ? abbreviateIDR(marketplace.aov) : 'Rp 0'}</span>
            </div>
          </div>
        </div>

        <div
          role={onInspect ? "button" : undefined}
          tabIndex={onInspect ? 0 : undefined}
          onClick={onInspect}
          onKeyDown={(event) => {
            if (onInspect && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              onInspect();
            }
          }}
          className={cn(
            "rounded-[8px] border border-border bg-background/35 p-4",
            onInspect ? "cursor-pointer transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45" : "",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Source health</p>
          <p className="mt-4 text-2xl font-bold text-foreground">{marketplace ? compactMarketplaceName(marketplace.channel) : 'No data'}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {marketplace
              ? `${formatNumber(marketplace.orders)} orders, ${formatNumber(marketplace.quantity)} sellable units, ${abbreviateIDR(marketplace.bookedGMV)} booked GMV.`
              : 'Upload marketplace order files to populate this source view.'}
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, marketplace?.percentage ?? 0)}%`, backgroundColor: accent }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{marketplace ? `${percent(marketplace.percentage)} of marketplace booked GMV` : 'Waiting for source data'}</p>
        </div>
      </div>
    </section>
  );
}

function MetricTile({ label, value, helper, icon, accent, onClick }: { label: string; value: string; helper: string; icon: ReactNode; accent: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group min-w-0 rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-card/90",
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

function EmptyState({ label }: { label: string }) {
  return <div className="flex h-64 items-center justify-center rounded-[8px] border border-dashed border-border bg-muted/10 px-4 text-center text-sm text-muted-foreground">{label}</div>;
}

export default function MarketplacePage() {
  const { data } = useDashboardData();
  const [activeView, setActiveView] = useState<MarketplaceView>('performance');
  const [focus, setFocus] = useState<MarketplaceFocus>('all');
  const [detail, setDetail] = useState<DashboardDetail | null>(null);

  const marketplaces = (data?.channels ?? []).filter((channel) => marketplaceKeys.has(channel.channelKey));
  const focusedMarketplaces = focus === 'all' ? marketplaces : marketplaces.filter((marketplace) => marketplace.channelKey === focus);
  const marketplaceStatuses = (data?.statuses ?? []).filter((status) => marketplaceKeys.has(sourceKeyFromLabel(status.source)));
  const focusedStatuses = focus === 'all' ? marketplaceStatuses : marketplaceStatuses.filter((status) => sourceKeyFromLabel(status.source) === focus);
  const purchaseChannels = (data?.marketplacePurchaseChannels ?? []).filter((row) => focus === 'all' || row.channelKey === focus);
  const recentMarketplaceOrders = (data?.orders ?? [])
    .filter((order) => order.channelGroup === 'Marketplace' && (focus === 'all' || sourceKeyFromLabel(order.source) === focus))
    .slice(0, 10);
  const marketplaceSkus = (data?.skus ?? [])
    .map((sku) => ({ ...sku, marketplaceGMV: skuMarketplaceValue(sku, focus) }))
    .filter((sku) => sku.marketplaceGMV > 0)
    .sort((a, b) => b.marketplaceGMV - a.marketplaceGMV)
    .slice(0, 25);

  const totalBooked = focusedMarketplaces.reduce((sum, marketplace) => sum + marketplace.bookedGMV, 0);
  const totalActive = focusedMarketplaces.reduce((sum, marketplace) => sum + marketplace.activeGMV, 0);
  const totalOrders = focusedMarketplaces.reduce((sum, marketplace) => sum + marketplace.orders, 0);
  const totalActiveOrders = focusedMarketplaces.reduce((sum, marketplace) => sum + marketplace.activeOrders, 0);
  const totalCancelledOrders = focusedMarketplaces.reduce((sum, marketplace) => sum + marketplace.cancelledOrders, 0);
  const totalRefund = focusedMarketplaces.reduce((sum, marketplace) => sum + marketplace.refundAmount, 0);
  const totalQuantity = focusedMarketplaces.reduce((sum, marketplace) => sum + marketplace.quantity, 0);
  const totalAov = totalOrders ? totalBooked / totalOrders : 0;
  const activeRate = totalOrders ? (totalActiveOrders / totalOrders) * 100 : 0;
  const cancellationRate = totalOrders ? (totalCancelledOrders / totalOrders) * 100 : 0;
  const bestChannel = [...focusedMarketplaces].sort((a, b) => b.bookedGMV - a.bookedGMV)[0];
  const riskChannel = [...focusedMarketplaces].sort((a, b) => b.cancellationRate - a.cancellationRate)[0];
  const activeMarketplace = focus === 'all' ? undefined : focusedMarketplaces[0];
  const activeFocusLabel = focusOptions.find((option) => option.key === focus)?.label ?? 'All Sources';
  const isGlobalPerformance = focus === 'all';
  const isShopeeFocus = focus === 'shopee';
  const isTikTokFocus = focus === 'tiktok1' || focus === 'tiktok2';
  const displayedSkuChartRows = marketplaceSkus.slice(0, 12).reverse();
  const displayedPurchaseChannelRows = purchaseChannels.slice(0, 10).reverse();

  function marketplaceMetrics(marketplace: ChannelSummary): DashboardDetail["metrics"] {
    const activeShare = marketplace.bookedGMV ? (marketplace.activeGMV / marketplace.bookedGMV) * 100 : 0;
    return [
      { label: 'Booked GMV', value: formatIDR(marketplace.bookedGMV), accent: marketplaceColor(marketplace.channelKey) },
      { label: 'Active GMV', value: formatIDR(marketplace.activeGMV), helper: `${percent(activeShare)} active conversion`, accent: '#10b981' },
      { label: 'Orders', value: formatNumber(marketplace.orders), helper: `${formatNumber(marketplace.activeOrders)} active orders` },
      { label: 'Cancel Rate', value: percent(marketplace.cancellationRate), helper: `${formatNumber(marketplace.cancelledOrders)} cancelled / refunded orders`, accent: '#ef4444' },
    ];
  }

  function marketplaceRows(marketplace: ChannelSummary): DashboardDetail["rows"] {
    return [
      { label: 'Channel Key', value: marketplace.channelKey },
      { label: 'Shop Account', value: marketplace.shopAccount || '-' },
      { label: 'AOV', value: formatIDR(marketplace.aov) },
      { label: 'Units Sold', value: formatNumber(marketplace.quantity) },
      { label: 'Line Items', value: formatNumber(marketplace.lineItems) },
      { label: 'Share of Marketplace', value: percent(marketplace.percentage) },
    ];
  }

  function buildOrderQuery(extra: Record<string, string | undefined> = {}) {
    const query = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search.slice(1));
    if (focus !== 'all') {
      query.set('channels', focus);
    } else if (!query.has('channels')) {
      query.set('channels', 'shopee,tiktok1,tiktok2');
    }

    query.set('channelGroup', 'Marketplace');
    query.set('limit', '100');
    Object.entries(extra).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return query;
  }

  function orderSourceLabel(order: Pick<MarketplaceOrderRow, 'sourceSystem' | 'shopAccount'>) {
    if (order.sourceSystem === 'shopee') return 'Shopee';
    return compactMarketplaceName(order.shopAccount || 'TikTok Shop');
  }

  function orderButton(order: MarketplaceOrderRow) {
    return (
      <button
        type="button"
        onClick={() => void openOrderSkuDetail(order.orderKey)}
        className="inline-flex min-h-8 max-w-[220px] items-center rounded-[6px] border border-primary/25 bg-primary/10 px-2.5 py-1 text-left text-xs font-bold text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        title="Open SKU-level detail"
      >
        <span className="truncate">{order.sourceOrderId}</span>
      </button>
    );
  }

  function orderListTable(orders: MarketplaceOrderRow[]) {
    return {
      columns: ['Order', 'Source', 'Status', 'City', 'Booked GMV', 'Active GMV'],
      rows: orders.map((order) => [
        orderButton(order),
        orderSourceLabel(order),
        order.normalizedStatus,
        order.city ?? '-',
        formatIDR(Number(order.bookedOrderGmv ?? 0)),
        formatIDR(Number(order.activeOrderGmv ?? 0)),
      ]),
    };
  }

  async function fetchOrders(extra: Record<string, string | undefined> = {}) {
    const response = await fetch(`/api/orders?${buildOrderQuery(extra).toString()}`, { cache: 'no-store' });
    const payload = (await response.json()) as ApiResponse<{ orders: MarketplaceOrderRow[] }>;
    if (!payload.ok || !payload.data) throw new Error(payload.error?.message ?? 'Failed to load order detail');
    return payload.data.orders;
  }

  async function openOrderListDetail({
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
  }) {
    setDetail({
      title,
      subtitle,
      badge,
      metrics,
      rows,
      note: 'Loading matching orders...',
    });

    try {
      const orders = await fetchOrders(extra);
      setDetail({
        title,
        subtitle,
        badge,
        metrics: [
          ...(metrics ?? []),
          { label: 'Loaded Orders', value: formatNumber(orders.length), helper: 'Maximum 100 rows shown. Click an order number for SKU-level detail.', accent: '#38bdf8' },
        ],
        rows,
        table: orders.length ? orderListTable(orders) : undefined,
        note: orders.length ? 'Click any order number in the table to open SKU-level detail for that order.' : 'No matching orders found for this detail context.',
      });
    } catch (error) {
      setDetail({
        title,
        subtitle,
        badge,
        metrics,
        rows,
        note: error instanceof Error ? error.message : 'Failed to load matching orders.',
      });
    }
  }

  async function openOrderSkuDetail(orderKey: string) {
    setDetail({
      title: 'Loading order detail',
      badge: 'SKU-Level Order',
      subtitle: 'Preparing SKU-level order detail...',
      note: 'Loading order items...',
    });

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderKey)}`, { cache: 'no-store' });
      const payload = (await response.json()) as ApiResponse<MarketplaceOrderDetailPayload>;
      if (!payload.ok || !payload.data) throw new Error(payload.error?.message ?? 'Failed to load order SKU detail');
      const { order, items, marketplace } = payload.data;

      setDetail({
        badge: 'SKU-Level Order',
        title: order.sourceOrderId,
        subtitle: 'Order detail with SKU-level item rows from the normalized dataset.',
        metrics: [
          { label: 'Booked GMV', value: formatIDR(Number(order.bookedOrderGmv ?? 0)), accent: '#38bdf8' },
          { label: 'Active GMV', value: formatIDR(Number(order.activeOrderGmv ?? 0)), accent: '#10b981' },
          { label: 'Refund', value: formatIDR(Number(order.orderRefundAmount ?? marketplace?.refundAmount ?? 0)), accent: '#ef4444' },
          { label: 'Items', value: formatNumber(items.length), accent: '#ec4899' },
        ],
        rows: [
          { label: 'Source', value: compactMarketplaceName(order.shopAccount || order.sourceSystem) },
          { label: 'Status', value: order.normalizedStatus },
          { label: 'Order Date', value: order.orderCreatedAt ? String(order.orderCreatedAt).slice(0, 10) : '-' },
          { label: 'Payment Method', value: order.paymentMethod ?? '-' },
          { label: 'Marketplace Status', value: marketplace?.marketplaceStatusRaw ?? '-' },
          { label: 'Fulfillment', value: marketplace?.fulfillmentStatusRaw ?? '-' },
          { label: 'Logistics', value: marketplace?.logisticsProvider ?? '-' },
          { label: 'Tracking Number', value: marketplace?.trackingNumber ?? '-' },
          { label: 'Cancellation Reason', value: marketplace?.cancellationReason ?? '-' },
        ],
        table: {
          columns: ['SKU', 'Product', 'Qty', 'Unit Price', 'Line GMV', 'Type'],
          rows: items.map((item) => [
            item.sourceSkuCode || '-',
            item.sourceProductName || '-',
            formatNumber(Number(item.quantity ?? 0)),
            formatIDR(Number(item.unitDiscountedPrice ?? 0)),
            formatIDR(Number(item.lineGmv ?? 0)),
            item.skuType || '-',
          ]),
        },
      });
    } catch (error) {
      setDetail({
        title: 'Order detail unavailable',
        badge: 'SKU-Level Order',
        subtitle: orderKey,
        note: error instanceof Error ? error.message : 'Failed to load order SKU detail.',
      });
    }
  }

  const openMetricDetail = (label: string, value: string, helper: string) => {
    void openOrderListDetail({
      title: label,
      subtitle: `Order list behind ${label} for the active Sales lens: ${activeFocusLabel}.`,
      badge: 'Sales KPI',
      metrics: [{ label, value, helper, accent: '#38bdf8' }],
      rows: [
        { label: 'Lens', value: activeFocusLabel },
        { label: 'Booked GMV', value: formatIDR(totalBooked) },
        { label: 'Active GMV', value: formatIDR(totalActive) },
        { label: 'Orders', value: formatNumber(totalOrders) },
        { label: 'Cancel Rate', value: percent(cancellationRate) },
      ],
    });
  };

  const openMarketplaceDetail = (marketplace: ChannelSummary | undefined, context = 'Marketplace source') => {
    if (!marketplace) return;
    void openOrderListDetail({
      title: compactMarketplaceName(marketplace.channel),
      subtitle: 'Order list behind this marketplace source. Click an order number to inspect SKU-level detail.',
      badge: context,
      extra: { channels: marketplace.channelKey },
      metrics: marketplaceMetrics(marketplace),
      rows: marketplaceRows(marketplace),
    });
  };

  const openPurchaseDetail = (row: MarketplacePurchaseChannelSummary | undefined) => {
    if (!row) return;
    const activeShare = row.bookedGMV ? (row.activeGMV / row.bookedGMV) * 100 : 0;
    void openOrderListDetail({
      title: row.purchaseChannel,
      subtitle: `${compactMarketplaceName(row.channel)} purchase-channel order list. Click an order number to inspect SKU-level detail.`,
      badge: 'Purchase Channel',
      extra: { channels: row.channelKey, purchaseChannel: row.purchaseChannel },
      metrics: [
        { label: 'Booked GMV', value: formatIDR(row.bookedGMV), accent: purchaseChannelColor(row.purchaseChannel, row.channelKey) },
        { label: 'Active GMV', value: formatIDR(row.activeGMV), helper: `${percent(activeShare)} active conversion`, accent: '#10b981' },
        { label: 'Orders', value: formatNumber(row.orders) },
        { label: 'Share', value: percent(row.share), accent: '#38bdf8' },
      ],
      rows: [
        { label: 'Source', value: compactMarketplaceName(row.channel) },
        { label: 'Quantity', value: formatNumber(row.quantity) },
      ],
    });
  };

  const openStatusDetail = (status: StatusSummary | undefined) => {
    if (!status) return;
    void openOrderListDetail({
      title: `${compactMarketplaceName(status.source)} - ${status.status}`,
      subtitle: 'Order list behind this normalized marketplace status. Click an order number to inspect SKU-level detail.',
      badge: 'Order Lifecycle',
      extra: { channels: sourceKeyFromLabel(status.source), status: status.status },
      metrics: [
        { label: 'Orders', value: formatNumber(status.orders), accent: lifecycleColors[status.status] ?? lifecycleColors.unknown },
        { label: 'Booked GMV', value: formatIDR(status.gmv) },
        { label: 'Source Share', value: percent(status.percentWithinSource), accent: '#38bdf8' },
      ],
      rows: [
        { label: 'Source', value: compactMarketplaceName(status.source) },
        { label: 'Status', value: status.status },
      ],
    });
  };

  const openOrderDetail = (order: RecentOrderSummary | undefined) => {
    if (!order) return;
    void openOrderSkuDetail(order.orderKey);
  };

  const openSkuDetail = (sku: (SkuSummary & { marketplaceGMV: number }) | undefined) => {
    if (!sku) return;
    void openOrderListDetail({
      title: sku.skuName,
      subtitle: `Order list behind this SKU scoped to ${activeFocusLabel}. Click an order number to inspect SKU-level detail.`,
      badge: 'SKU Detail',
      extra: { sku: sku.skuCode || sku.skuName },
      metrics: [
        { label: `${activeFocusLabel} GMV`, value: formatIDR(sku.marketplaceGMV), accent: '#38bdf8' },
        { label: 'Quantity', value: formatNumber(sku.quantity), accent: '#ec4899' },
        { label: 'Orders', value: formatNumber(sku.orders), accent: '#10b981' },
      ],
      rows: [
        { label: 'SKU Code', value: sku.skuCode },
        { label: 'SKU Type', value: sku.skuType || '-' },
        { label: 'Shopee GMV', value: formatIDR(sku.shopee) },
        { label: 'TikTok ID GMV', value: formatIDR(sku.tiktok1) },
        { label: 'TikTok Card GMV', value: formatIDR(sku.tiktok2) },
      ],
    });
  };

  const openDailyDetail = (day?: DailyGMVPoint) => {
    if (!day) return;
    void openOrderListDetail({
      title: day.date,
      subtitle: `Order list behind daily booked GMV for ${activeFocusLabel}. Click an order number to inspect SKU-level detail.`,
      badge: 'Daily Demand',
      extra: { start: day.date, end: day.date },
      metrics: [
        { label: 'Booked GMV', value: formatIDR(day.bookedGMV), accent: '#38bdf8' },
        { label: 'Active GMV', value: formatIDR(day.activeGMV), accent: '#10b981' },
        { label: 'Orders', value: formatNumber(day.orders) },
      ],
      rows: [
        { label: 'Shopee', value: formatIDR(day.shopee) },
        { label: 'TikTok ID', value: formatIDR(day.tiktok1) },
        { label: 'TikTok Card', value: formatIDR(day.tiktok2) },
      ],
    });
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <section className="relative overflow-hidden rounded-[8px] border border-border bg-card">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-orange-400 via-cyan-300 to-green-400" />
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_420px] lg:p-6">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-[8px] border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShoppingBag className="h-3.5 w-3.5" />
                Marketplace Intelligence Center
              </span>
              <span className="rounded-[8px] border border-orange-400/25 bg-orange-400/10 px-2.5 py-1 text-xs font-semibold text-orange-200">Shopee</span>
              <span className="rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">TikTok Shop</span>
              <span className="rounded-[8px] border border-green-400/25 bg-green-400/10 px-2.5 py-1 text-xs font-semibold text-green-100">Tokopedia Channel</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {activeView === 'performance' ? 'Marketplace Sales Performance' : 'Marketplace Income & Settlement'}
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
              {activeView === 'performance'
                ? 'Executive view for marketplace demand, active order health, cancellation exposure, purchase-channel mix, and SKU concentration across Shopee, TikTok Shop, and Tokopedia-origin transactions.'
                : 'Dedicated control tower for marketplace payment reconciliation, fees, payout movement, adjustments, and settlement quality from uploaded income files.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {marketplaceViews.map((view) => {
              const isActive = activeView === view.key;
              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setActiveView(view.key)}
                  className={cn(
                    'group flex items-center gap-3 rounded-[8px] border px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5',
                    isActive
                      ? 'border-primary/45 bg-primary/10 text-primary shadow-lg shadow-primary/10'
                      : 'border-border bg-background/35 text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground',
                  )}
                >
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border transition-colors', isActive ? 'border-primary/30 bg-primary/15' : 'border-border bg-muted/25')}>
                    {view.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{view.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{view.description}</span>
                  </span>
                  <ArrowUpRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5', isActive ? 'opacity-100' : 'opacity-45')} />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {activeView === 'settlement' ? (
        <IncomeSettlementPanel />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-[8px] border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 px-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-border bg-muted/30 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Sales lens</p>
                <p className="truncate text-xs text-muted-foreground">Local view filter for this tab only</p>
              </div>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
              {focusOptions.map((option) => {
                const isActive = focus === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setFocus(option.key)}
                    className={cn(
                      'rounded-[8px] border px-3 py-2 text-xs font-semibold transition-all duration-300',
                      isActive ? 'bg-background text-foreground shadow-sm' : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                    )}
                    style={{ borderColor: isActive ? option.accent : undefined }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isGlobalPerformance ? (
            <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricTile label="Booked GMV" value={abbreviateIDR(totalBooked)} helper={`${formatNumber(totalOrders)} marketplace orders`} icon={<ShoppingBag className="h-4 w-4" />} accent="#38bdf8" onClick={() => openMetricDetail('Booked GMV', formatIDR(totalBooked), `${formatNumber(totalOrders)} marketplace orders`)} />
            <MetricTile label="Active GMV" value={abbreviateIDR(totalActive)} helper={`${percent(activeRate)} active order rate`} icon={<CheckCircle2 className="h-4 w-4" />} accent="#10b981" onClick={() => openMetricDetail('Active GMV', formatIDR(totalActive), `${percent(activeRate)} active order rate`)} />
            <MetricTile label="Cancellation Value" value={abbreviateIDR(totalRefund)} helper={`${formatNumber(totalCancelledOrders)} cancelled / refunded orders`} icon={<XCircle className="h-4 w-4" />} accent="#ef4444" onClick={() => openMetricDetail('Cancellation Value', formatIDR(totalRefund), `${formatNumber(totalCancelledOrders)} cancelled / refunded orders`)} />
            <MetricTile label="AOV" value={abbreviateIDR(totalAov)} helper="Average booked GMV per order" icon={<TrendingUp className="h-4 w-4" />} accent="#f59e0b" onClick={() => openMetricDetail('AOV', formatIDR(totalAov), 'Average booked GMV per order')} />
            <MetricTile label="Units Sold" value={formatNumber(totalQuantity)} helper="Quantity from sellable SKU rows" icon={<PackageCheck className="h-4 w-4" />} accent="#ec4899" onClick={() => openMetricDetail('Units Sold', formatNumber(totalQuantity), 'Quantity from sellable SKU rows')} />
            <MetricTile label="Cancel Rate" value={percent(cancellationRate)} helper={riskChannel ? `${compactMarketplaceName(riskChannel.channel)} highest risk` : 'No cancellation data'} icon={<AlertTriangle className="h-4 w-4" />} accent="#fb7185" onClick={() => openMetricDetail('Cancel Rate', percent(cancellationRate), riskChannel ? `${compactMarketplaceName(riskChannel.channel)} highest risk` : 'No cancellation data')} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <ChartCard title="Marketplace Demand Control" subtitle="Booked vs active GMV by marketplace account" className="min-h-[410px]">
              {focusedMarketplaces.length ? (
                <EChart
                  option={getDemandComparisonOption(focusedMarketplaces)}
                  style={{ height: 350 }}
                  onClick={(params) => {
                    const p = params as ChartClickParams;
                    const row = focusedMarketplaces.find((marketplace) => compactMarketplaceName(marketplace.channel) === p.name);
                    if (row) openMarketplaceDetail(row, p.seriesName ?? 'Marketplace Demand Control');
                  }}
                />
              ) : <EmptyState label="No marketplace demand data in this filter." />}
            </ChartCard>

            <div className="grid gap-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => openMarketplaceDetail(bestChannel, "Executive Signal")}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openMarketplaceDetail(bestChannel, "Executive Signal");
                  }
                }}
                className="cursor-pointer rounded-[8px] border border-border bg-card p-5 transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Executive Signal</p>
                    <p className="mt-1 text-xs text-muted-foreground">Largest demand source in current lens</p>
                  </div>
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{bestChannel ? compactMarketplaceName(bestChannel.channel) : 'No data'}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {bestChannel ? `${formatIDR(bestChannel.bookedGMV)} booked GMV, ${formatNumber(bestChannel.orders)} orders, ${percent(bestChannel.cancellationRate)} cancel rate.` : 'Upload marketplace order files to populate this panel.'}
                </p>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setDetail({
                  badge: 'Data Logic',
                  title: 'Data Logic Guardrails',
                  subtitle: 'Rules used to keep Marketplace Sales Performance management-ready.',
                  rows: [
                    { label: 'Order GMV', value: 'Deduped by marketplace order ID.' },
                    { label: 'SKU GMV', value: 'Uses sellable line rows and excludes giveaway/POSM items.' },
                    { label: 'TikTok Channel', value: 'TikTok purchase channels expose TikTok and Tokopedia-origin demand.' },
                  ],
                })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setDetail({
                      badge: 'Data Logic',
                      title: 'Data Logic Guardrails',
                      subtitle: 'Rules used to keep Marketplace Sales Performance management-ready.',
                      rows: [
                        { label: 'Order GMV', value: 'Deduped by marketplace order ID.' },
                        { label: 'SKU GMV', value: 'Uses sellable line rows and excludes giveaway/POSM items.' },
                        { label: 'TikTok Channel', value: 'TikTok purchase channels expose TikTok and Tokopedia-origin demand.' },
                      ],
                    });
                  }
                }}
                className="cursor-pointer rounded-[8px] border border-border bg-card p-5 transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Data Logic Guardrails</p>
                  <Layers3 className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />Order GMV is deduped by marketplace order ID.</div>
                  <div className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-300" />SKU GMV uses sellable line rows and excludes giveaway/POSM items.</div>
                  <div className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />TikTok purchase channels expose TikTok and Tokopedia-origin demand.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Daily Demand Pulse" subtitle="Booked GMV trend by marketplace source">
              <EChart option={getDailyDemandOption(data?.dailyGMV ?? [], focus)} style={{ height: 360 }} onClick={(params) => openDailyDetail((data?.dailyGMV ?? [])[(params as ChartClickParams).dataIndex ?? -1])} />
            </ChartCard>
            <ChartCard title="Purchase Channel Mix" subtitle="Shopee, TikTok Shop, and Tokopedia-origin GMV from raw marketplace channels">
              {purchaseChannels.length ? <EChart option={getPurchaseChannelOption(purchaseChannels)} style={{ height: 360 }} onClick={(params) => openPurchaseDetail(purchaseChannels[(params as ChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No purchase-channel rows available for this lens." />}
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Order Lifecycle Matrix" subtitle="Order count distribution by normalized status">
              {focusedStatuses.length ? (
                <EChart
                  option={getLifecycleOption(focusedStatuses, focusedMarketplaces)}
                  style={{ height: 360 }}
                  onClick={(params) => {
                    const p = params as ChartClickParams;
                    const row = focusedStatuses.find((status) => status.status === p.seriesName && compactMarketplaceName(status.source) === p.name);
                    if (row) openStatusDetail(row);
                  }}
                />
              ) : <EmptyState label="No lifecycle status rows available." />}
            </ChartCard>
            <ChartCard title="AOV vs Cancellation Risk" subtitle="Bubble size represents order volume">
              {focusedMarketplaces.length ? <EChart option={getRiskScatterOption(focusedMarketplaces)} style={{ height: 360 }} onClick={(params) => openMarketplaceDetail(focusedMarketplaces[(params as ChartClickParams).dataIndex ?? -1], 'AOV vs Cancellation Risk')} /> : <EmptyState label="No risk data available." />}
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <ChartCard title="SKU Demand Leaderboard" subtitle="Top marketplace products by sellable SKU GMV">
              {marketplaceSkus.length ? <EChart option={getSkuLeaderOption(marketplaceSkus)} style={{ height: 440 }} onClick={(params) => openSkuDetail(displayedSkuChartRows[(params as ChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No marketplace SKU data in this lens." />}
            </ChartCard>

            <ChartCard title="Channel Performance Cards" subtitle="Demand health and active conversion by account">
              <div className="space-y-3">
                {focusedMarketplaces.map((marketplace) => {
                  const activeShare = marketplace.bookedGMV ? (marketplace.activeGMV / marketplace.bookedGMV) * 100 : 0;
                  return (
                    <div
                      key={marketplace.channelKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => openMarketplaceDetail(marketplace, 'Channel Performance Card')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openMarketplaceDetail(marketplace, 'Channel Performance Card');
                        }
                      }}
                      className="cursor-pointer rounded-[8px] border border-border bg-background/35 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{compactMarketplaceName(marketplace.channel)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatNumber(marketplace.orders)} orders - {formatNumber(marketplace.quantity)} units - {abbreviateIDR(marketplace.aov)} AOV</p>
                        </div>
                        <span className="rounded-[8px] border border-border px-2.5 py-1 text-xs font-semibold" style={{ color: marketplaceColor(marketplace.channelKey) }}>
                          {percent(marketplace.percentage)}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted-foreground">Active GMV conversion</span>
                        <span className="font-semibold text-foreground">{percent(activeShare)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, activeShare)}%`, backgroundColor: marketplaceColor(marketplace.channelKey) }} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div><span className="block text-muted-foreground">Booked</span><span className="font-semibold text-foreground">{abbreviateIDR(marketplace.bookedGMV)}</span></div>
                        <div><span className="block text-muted-foreground">Active</span><span className="font-semibold text-foreground">{abbreviateIDR(marketplace.activeGMV)}</span></div>
                        <div><span className="block text-muted-foreground">Cancel</span><span className="font-semibold text-foreground">{percent(marketplace.cancellationRate)}</span></div>
                      </div>
                    </div>
                  );
                })}
                {!focusedMarketplaces.length && <EmptyState label="No marketplace channel data available." />}
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Marketplace Status Detail" subtitle="Normalized order status by marketplace source">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Source</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4 text-right">Orders</th>
                      <th className="pb-3 pr-4 text-right">Booked GMV</th>
                      <th className="pb-3 text-right">% Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {focusedStatuses.map((status: StatusSummary) => (
                      <tr key={`${status.source}-${status.status}`} onClick={() => openStatusDetail(status)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{compactMarketplaceName(status.source)}</td>
                        <td className="py-3 pr-4 font-medium text-foreground">{status.status}</td>
                        <td className="py-3 pr-4 text-right text-foreground">{formatNumber(status.orders)}</td>
                        <td className="py-3 pr-4 text-right text-foreground">{formatIDR(status.gmv)}</td>
                        <td className="py-3 text-right text-primary">{percent(status.percentWithinSource)}</td>
                      </tr>
                    ))}
                    {!focusedStatuses.length && <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No marketplace status data available.</td></tr>}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard title="Latest Marketplace Orders" subtitle="Recent normalized orders for operational drilldown">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Order</th>
                      <th className="pb-3 pr-4">Source</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">City</th>
                      <th className="pb-3 text-right">Booked GMV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMarketplaceOrders.map((order: RecentOrderSummary) => (
                      <tr key={order.orderKey} onClick={() => openOrderDetail(order)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                        <td className="max-w-[150px] truncate py-3 pr-4 font-medium text-foreground" title={order.sourceOrderId}>{order.sourceOrderId}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{compactMarketplaceName(order.source)}</td>
                        <td className="py-3 pr-4 text-foreground">{order.status}</td>
                        <td className="max-w-[130px] truncate py-3 pr-4 text-muted-foreground">{order.city ?? '-'}</td>
                        <td className="py-3 text-right font-semibold text-foreground">{formatIDR(order.bookedGMV)}</td>
                      </tr>
                    ))}
                    {!recentMarketplaceOrders.length && <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No recent marketplace orders available.</td></tr>}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Top Marketplace SKUs" subtitle="SKU-level GMV by Shopee, TikTok ID, and TikTok Card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4 text-right">Marketplace GMV</th>
                    <th className="pb-3 pr-4 text-right">Qty</th>
                    <th className="pb-3 pr-4 text-right">Orders</th>
                    <th className="pb-3 pr-4 text-right">TikTok ID</th>
                    <th className="pb-3 pr-4 text-right">TikTok Card</th>
                    <th className="pb-3 text-right">Shopee</th>
                  </tr>
                </thead>
                <tbody>
                  {marketplaceSkus.map((sku, index) => (
                    <tr key={sku.skuCode} onClick={() => openSkuDetail(sku)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                      <td className="py-3 pr-4"><span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold', index < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground')}>{index + 1}</span></td>
                      <td className="max-w-[320px] truncate py-3 pr-4 font-medium text-foreground" title={sku.skuName}>{sku.skuName}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(sku.marketplaceGMV)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(sku.quantity)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(sku.orders)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatIDR(sku.tiktok1)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatIDR(sku.tiktok2)}</td>
                      <td className="py-3 text-right text-foreground">{formatIDR(sku.shopee)}</td>
                    </tr>
                  ))}
                  {!marketplaceSkus.length && <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No marketplace SKU data available.</td></tr>}
                </tbody>
              </table>
            </div>
          </ChartCard>
            </>
          ) : (
            <>
          <MarketplaceFocusHero marketplace={activeMarketplace} label={activeFocusLabel} isShopee={isShopeeFocus} onInspect={() => openMarketplaceDetail(activeMarketplace, "Source Health")} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricTile label="Booked GMV" value={abbreviateIDR(totalBooked)} helper={`${formatNumber(totalOrders)} ${activeFocusLabel} orders`} icon={<ShoppingBag className="h-4 w-4" />} accent={activeMarketplace ? marketplaceColor(activeMarketplace.channelKey) : '#38bdf8'} onClick={() => openMetricDetail('Booked GMV', formatIDR(totalBooked), `${formatNumber(totalOrders)} ${activeFocusLabel} orders`)} />
            <MetricTile label="Active GMV" value={abbreviateIDR(totalActive)} helper={`${percent(activeRate)} active order conversion`} icon={<CheckCircle2 className="h-4 w-4" />} accent="#10b981" onClick={() => openMetricDetail('Active GMV', formatIDR(totalActive), `${percent(activeRate)} active order conversion`)} />
            <MetricTile label="Cancellation Value" value={abbreviateIDR(totalRefund)} helper={`${formatNumber(totalCancelledOrders)} cancelled / refunded orders`} icon={<XCircle className="h-4 w-4" />} accent="#ef4444" onClick={() => openMetricDetail('Cancellation Value', formatIDR(totalRefund), `${formatNumber(totalCancelledOrders)} cancelled / refunded orders`)} />
            <MetricTile label="AOV" value={abbreviateIDR(totalAov)} helper="Average booked GMV per order" icon={<TrendingUp className="h-4 w-4" />} accent="#f59e0b" onClick={() => openMetricDetail('AOV', formatIDR(totalAov), 'Average booked GMV per order')} />
            <MetricTile label="Units Sold" value={formatNumber(totalQuantity)} helper="Quantity from sellable SKU rows" icon={<PackageCheck className="h-4 w-4" />} accent="#ec4899" onClick={() => openMetricDetail('Units Sold', formatNumber(totalQuantity), 'Quantity from sellable SKU rows')} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <ChartCard title={`${activeFocusLabel} GMV Quality`} subtitle="Booked, active, and cancellation exposure for this marketplace source">
              {activeMarketplace ? <EChart option={getFocusedDemandOption(activeMarketplace)} style={{ height: 400 }} onClick={() => openMarketplaceDetail(activeMarketplace, `${activeFocusLabel} GMV Quality`)} /> : <EmptyState label={`No ${activeFocusLabel} demand data available.`} />}
            </ChartCard>
            <ChartCard title={`${activeFocusLabel} Daily Demand Pulse`} subtitle="Booked GMV trend for the selected marketplace source">
              <EChart option={getDailyDemandOption(data?.dailyGMV ?? [], focus)} style={{ height: 400 }} onClick={(params) => openDailyDetail((data?.dailyGMV ?? [])[(params as ChartClickParams).dataIndex ?? -1])} />
            </ChartCard>
          </div>

          {isTikTokFocus ? (
            <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
              <ChartCard title={`${activeFocusLabel} Purchase Channel Split`} subtitle="TikTok Shop vs Tokopedia-origin demand inside this selected account">
                {purchaseChannels.length ? <EChart option={getPurchaseChannelBarOption(purchaseChannels)} style={{ height: 390 }} onClick={(params) => openPurchaseDetail(displayedPurchaseChannelRows[(params as ChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No purchase-channel rows available for this TikTok source." />}
              </ChartCard>
              <ChartCard title={`${activeFocusLabel} Lifecycle Distribution`} subtitle="Order status concentration and cancellation pressure">
                {focusedStatuses.length ? <EChart option={getStatusDistributionOption(focusedStatuses)} style={{ height: 390 }} onClick={(params) => openStatusDetail(focusedStatuses.find((status) => status.status === (params as ChartClickParams).name))} /> : <EmptyState label="No lifecycle status rows available for this TikTok source." />}
              </ChartCard>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <ChartCard title="Shopee Lifecycle Distribution" subtitle="Order status concentration and cancellation pressure">
                {focusedStatuses.length ? <EChart option={getStatusDistributionOption(focusedStatuses)} style={{ height: 390 }} onClick={(params) => openStatusDetail(focusedStatuses.find((status) => status.status === (params as ChartClickParams).name))} /> : <EmptyState label="No lifecycle status rows available for Shopee." />}
              </ChartCard>
              <ChartCard title="Shopee SKU Demand Leaderboard" subtitle="Products contributing the highest sellable SKU GMV">
                {marketplaceSkus.length ? <EChart option={getSkuLeaderOption(marketplaceSkus)} style={{ height: 390 }} onClick={(params) => openSkuDetail(displayedSkuChartRows[(params as ChartClickParams).dataIndex ?? -1])} /> : <EmptyState label="No Shopee SKU data available." />}
              </ChartCard>
            </div>
          )}

          {isTikTokFocus && (
            <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <ChartCard title={`${activeFocusLabel} SKU Demand Leaderboard`} subtitle="Top sellable products inside this TikTok account">
                {marketplaceSkus.length ? <EChart option={getSkuLeaderOption(marketplaceSkus)} style={{ height: 410 }} onClick={(params) => openSkuDetail(displayedSkuChartRows[(params as ChartClickParams).dataIndex ?? -1])} /> : <EmptyState label={`No ${activeFocusLabel} SKU data available.`} />}
              </ChartCard>
              <ChartCard title={`${activeFocusLabel} Channel Mix Cards`} subtitle="Purchase-channel performance and active conversion">
                <div className="space-y-3">
                  {purchaseChannels.map((channel) => {
                    const activeShare = channel.bookedGMV ? (channel.activeGMV / channel.bookedGMV) * 100 : 0;
                    return (
                      <div
                        key={`${channel.channelKey}-${channel.purchaseChannel}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openPurchaseDetail(channel)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openPurchaseDetail(channel);
                          }
                        }}
                        className="cursor-pointer rounded-[8px] border border-border bg-background/35 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/45"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{channel.purchaseChannel}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatNumber(channel.orders)} orders - {formatNumber(channel.quantity)} units</p>
                          </div>
                          <span className="rounded-[8px] border border-border px-2.5 py-1 text-xs font-semibold" style={{ color: purchaseChannelColor(channel.purchaseChannel, channel.channelKey) }}>
                            {percent(channel.share)}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-4 text-xs">
                          <span className="text-muted-foreground">Active GMV conversion</span>
                          <span className="font-semibold text-foreground">{percent(activeShare)}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, activeShare)}%`, backgroundColor: purchaseChannelColor(channel.purchaseChannel, channel.channelKey) }} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div><span className="block text-muted-foreground">Booked</span><span className="font-semibold text-foreground">{abbreviateIDR(channel.bookedGMV)}</span></div>
                          <div><span className="block text-muted-foreground">Active</span><span className="font-semibold text-foreground">{abbreviateIDR(channel.activeGMV)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                  {!purchaseChannels.length && <EmptyState label="No purchase-channel cards available." />}
                </div>
              </ChartCard>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
            <ChartCard title={`${activeFocusLabel} Status Detail`} subtitle="Normalized order status scoped to the selected source">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4 text-right">Orders</th>
                      <th className="pb-3 pr-4 text-right">Booked GMV</th>
                      <th className="pb-3 text-right">% Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {focusedStatuses.map((status: StatusSummary) => (
                      <tr key={`${status.source}-${status.status}`} onClick={() => openStatusDetail(status)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                        <td className="py-3 pr-4 font-medium text-foreground">{status.status}</td>
                        <td className="py-3 pr-4 text-right text-foreground">{formatNumber(status.orders)}</td>
                        <td className="py-3 pr-4 text-right text-foreground">{formatIDR(status.gmv)}</td>
                        <td className="py-3 text-right text-primary">{percent(status.percentWithinSource)}</td>
                      </tr>
                    ))}
                    {!focusedStatuses.length && <tr><td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">No status data available for this source.</td></tr>}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard title={`${activeFocusLabel} Latest Orders`} subtitle="Recent normalized orders for operational drilldown">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4">Order</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">City</th>
                      <th className="pb-3 pr-4">Customer</th>
                      <th className="pb-3 text-right">Booked GMV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMarketplaceOrders.map((order: RecentOrderSummary) => (
                      <tr key={order.orderKey} onClick={() => openOrderDetail(order)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                        <td className="max-w-[150px] truncate py-3 pr-4 font-medium text-foreground" title={order.sourceOrderId}>{order.sourceOrderId}</td>
                        <td className="py-3 pr-4 text-foreground">{order.status}</td>
                        <td className="max-w-[130px] truncate py-3 pr-4 text-muted-foreground">{order.city ?? '-'}</td>
                        <td className="max-w-[140px] truncate py-3 pr-4 text-muted-foreground">{order.customer ?? '-'}</td>
                        <td className="py-3 text-right font-semibold text-foreground">{formatIDR(order.bookedGMV)}</td>
                      </tr>
                    ))}
                    {!recentMarketplaceOrders.length && <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No recent orders available for this source.</td></tr>}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          <ChartCard title={`Top ${activeFocusLabel} SKUs`} subtitle="Focused SKU table with only the selected marketplace GMV">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4 text-right">{activeFocusLabel} GMV</th>
                    <th className="pb-3 pr-4 text-right">Qty</th>
                    <th className="pb-3 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {marketplaceSkus.map((sku, index) => (
                    <tr key={sku.skuCode} onClick={() => openSkuDetail(sku)} className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/25">
                      <td className="py-3 pr-4"><span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold', index < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground')}>{index + 1}</span></td>
                      <td className="max-w-[420px] truncate py-3 pr-4 font-medium text-foreground" title={sku.skuName}>{sku.skuName}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(sku.marketplaceGMV)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(sku.quantity)}</td>
                      <td className="py-3 text-right text-foreground">{formatNumber(sku.orders)}</td>
                    </tr>
                  ))}
                  {!marketplaceSkus.length && <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No SKU data available for this source.</td></tr>}
                </tbody>
              </table>
            </div>
          </ChartCard>
            </>
          )}
        </div>
      )}
      <DashboardDetailDialog detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
