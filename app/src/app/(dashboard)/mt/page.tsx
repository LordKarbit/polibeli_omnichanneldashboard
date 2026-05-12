'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { AlertTriangle, Building2, Package, ShoppingCart } from 'lucide-react';

import { EChart } from '@/components/charts/echart';
import { ChartCard } from '@/components/ui/chart-card';
import { KPICard } from '@/components/ui/kpi-card';
import { mergeChartOptions } from '@/lib/chart-config';
import {
  type ChannelSummary,
  type DailyGMVPoint,
  type SkuSummary,
  type StatusSummary,
  useDashboardData,
} from '@/lib/dashboard-client';
import { abbreviateIDR, formatIDR, formatNumber, formatPercent } from '@/lib/format';
import { chartColors } from '@/lib/theme';

function shortName(value: string, maxLength = 28) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function sortByMTGMV(skus: SkuSummary[]) {
  return [...skus].sort((a, b) => b.mtGMV - a.mtGMV);
}

function getSKUMixOption(skus: SkuSummary[]): EChartsOption {
  const rows = sortByMTGMV(skus)
    .filter((sku) => sku.mtGMV > 0)
    .slice(0, 8);

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>${formatIDR(p.value)}<br/>${p.percent}%`;
      },
    },
    legend: {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['34%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.35)', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
        data: rows.map((sku, index) => ({
          value: sku.mtGMV,
          name: shortName(sku.skuName, 24),
          itemStyle: { color: chartColors.primary[index % chartColors.primary.length] },
        })),
      },
    ],
  });
}

function getDailyMTGMVOption(daily: DailyGMVPoint[]): EChartsOption {
  const rows = daily.filter((point) => Number(point.mt ?? 0) > 0);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        return `<strong>${p.name}</strong><br/>MT GMV: ${formatIDR(p.value)}`;
      },
    },
    grid: { left: 12, right: 16, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: rows.map((point) => point.date),
      axisLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 10, rotate: rows.length > 8 ? 35 : 0 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        formatter: (value: number) => abbreviateIDR(value),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        name: 'MT GMV',
        type: 'bar',
        data: rows.map((point) => point.mt),
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: chartColors.channels.mt },
              { offset: 1, color: `${chartColors.channels.mt}55` },
            ],
          },
          borderRadius: [5, 5, 0, 0],
        },
        barWidth: rows.length > 20 ? '55%' : '34%',
      },
    ],
  });
}

function getStatusFunnelOption(channel: ChannelSummary | undefined): EChartsOption {
  const total = Math.max(1, channel?.orders ?? 0);
  const active = channel?.activeOrders ?? 0;
  const cancelled = channel?.cancelledOrders ?? 0;
  const refundedValue = channel?.refundAmount ?? 0;

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number };
        return `<strong>${p.name}</strong><br/>${p.value.toFixed(1)}%`;
      },
    },
    series: [
      {
        type: 'funnel',
        left: '8%',
        top: 14,
        bottom: 14,
        width: '84%',
        min: 0,
        max: 100,
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
          formatter: '{b}\n{c}%',
        },
        itemStyle: { borderColor: 'rgba(0,0,0,0.35)', borderWidth: 1 },
        data: [
          { value: 100, name: `Booked (${formatNumber(channel?.orders ?? 0)})`, itemStyle: { color: chartColors.primary[2] } },
          { value: (active / total) * 100, name: `Active (${formatNumber(active)})`, itemStyle: { color: chartColors.primary[5] } },
          {
            value: (cancelled / total) * 100,
            name: `Cancelled (${formatNumber(cancelled)})`,
            itemStyle: { color: chartColors.primary[4] },
          },
          {
            value: channel?.bookedGMV ? (refundedValue / channel.bookedGMV) * 100 : 0,
            name: 'Refund Value',
            itemStyle: { color: chartColors.primary[3] },
          },
        ],
      },
    ],
  });
}

function getTopSKUBarOption(skus: SkuSummary[]): EChartsOption {
  const sorted = sortByMTGMV(skus)
    .filter((sku) => sku.mtGMV > 0)
    .slice(0, 10);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ dataIndex: number; value: number }>)[0];
        const sku = sorted[p.dataIndex];
        return `<strong>${sku?.skuName ?? 'SKU'}</strong><br/>
          MT GMV: ${formatIDR(p.value)}<br/>
          Quantity: ${formatNumber(sku?.quantity ?? 0)}<br/>
          Orders: ${formatNumber(sku?.orders ?? 0)}`;
      },
    },
    grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        formatter: (value: number) => abbreviateIDR(value),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((sku) => shortName(sku.skuName, 32)),
      inverse: true,
      axisLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10, width: 170, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((sku, index) => ({
          value: sku.mtGMV,
          itemStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: `${chartColors.primary[index % chartColors.primary.length]}77` },
                { offset: 1, color: chartColors.primary[index % chartColors.primary.length] },
              ],
            },
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barWidth: '55%',
      },
    ],
  });
}

function getStatusMixOption(statuses: StatusSummary[]): EChartsOption {
  const rows = statuses.filter((status) => status.source.toLowerCase().includes('mt'));

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>Orders: ${formatNumber(p.value)}<br/>${p.percent}%`;
      },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.35)', borderWidth: 2 },
        label: { show: false },
        data: rows.map((row, index) => ({
          name: row.status,
          value: row.orders,
          itemStyle: { color: chartColors.primary[index % chartColors.primary.length] },
        })),
      },
    ],
  });
}

function EmptyTableRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td className="py-8 text-center text-sm text-muted-foreground" colSpan={colSpan}>
        No live MT data for the current filter.
      </td>
    </tr>
  );
}

export default function MTPerformancePage() {
  const { data, isLoading } = useDashboardData();
  const mtChannel = data?.channels.find((channel) => channel.channelKey === 'mt');
  const mtSKUs = useMemo(
    () => sortByMTGMV((data?.skus ?? []).filter((sku) => sku.mtGMV > 0)),
    [data?.skus],
  );
  const mtStatuses = useMemo(
    () => (data?.statuses ?? []).filter((status) => status.source.toLowerCase().includes('mt')),
    [data?.statuses],
  );
  const daily = data?.dailyGMV ?? [];
  const topSKU = mtSKUs[0];
  const bookedGMV = mtChannel?.bookedGMV ?? 0;
  const activeGMV = mtChannel?.activeGMV ?? 0;
  const orders = mtChannel?.orders ?? 0;
  const cancelRate = mtChannel?.cancellationRate ?? 0;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="MT Booked GMV" value={abbreviateIDR(bookedGMV)} icon={<Building2 className="h-5 w-5" />} />
        <KPICard label="MT Active GMV" value={abbreviateIDR(activeGMV)} icon={<Package className="h-5 w-5" />} />
        <KPICard label="MT Orders" value={isLoading && !orders ? 'Loading' : formatNumber(orders)} icon={<ShoppingCart className="h-5 w-5" />} />
        <KPICard label="Cancel Rate" value={formatPercent(cancelRate)} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="rounded-[8px] border border-purple-500/20 bg-purple-500/5 p-4">
        <p className="text-sm leading-6 text-purple-200">
          <strong>MT / Agency rule:</strong> live B2B rows classified as Modern Trade are shown here. Reporting GMV is cleaned
          from excluded giveaway/POSM SKUs, so this page follows the same management reporting basis as the rest of the app.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="MT SKU Mix" subtitle="Contribution by cleaned product GMV">
          <EChart option={getSKUMixOption(mtSKUs)} style={{ height: 330 }} />
        </ChartCard>

        <ChartCard title="MT Daily GMV" subtitle="Booked GMV trend from live uploaded orders">
          <EChart option={getDailyMTGMVOption(daily)} style={{ height: 330 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="MT Order Lifecycle" subtitle="Active, cancelled, and refund view">
          <EChart option={getStatusFunnelOption(mtChannel)} style={{ height: 330 }} />
        </ChartCard>

        <ChartCard title="Top MT SKU" subtitle={topSKU ? `Leader: ${topSKU.skuName}` : 'Ranked by MT GMV'}>
          <EChart option={getTopSKUBarOption(mtSKUs)} style={{ height: 330 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ChartCard title="MT / Agency SKU Performance" subtitle="Products sold through Modern Trade channel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">SKU Code</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4 text-right">MT GMV</th>
                  <th className="pb-3 pr-4 text-right">Qty</th>
                  <th className="pb-3 text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {mtSKUs.map((sku, index) => (
                  <tr key={sku.skuCode} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="py-3 pr-4">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index < 3 ? 'bg-purple-500/15 text-purple-300' : 'text-muted-foreground'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{sku.skuCode}</td>
                    <td className="max-w-[240px] truncate py-3 pr-4 font-medium text-foreground" title={sku.skuName}>
                      {sku.skuName}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(sku.mtGMV)}</td>
                    <td className="py-3 pr-4 text-right text-foreground">{formatNumber(sku.quantity)}</td>
                    <td className="py-3 text-right text-foreground">{formatNumber(sku.orders)}</td>
                  </tr>
                ))}
                {!mtSKUs.length && <EmptyTableRow colSpan={6} />}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="MT Status Detail" subtitle="Order status distribution for MT">
          <div className="grid gap-5 lg:grid-rows-[260px_auto]">
            <EChart option={getStatusMixOption(mtStatuses)} style={{ height: 260 }} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4 text-right">Orders</th>
                    <th className="pb-3 text-right">GMV</th>
                  </tr>
                </thead>
                <tbody>
                  {mtStatuses.map((status) => (
                    <tr key={`${status.source}-${status.status}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                      <td className="py-3 pr-4 font-medium capitalize text-foreground">{status.status}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(status.orders)}</td>
                      <td className="py-3 text-right font-semibold text-foreground">{formatIDR(status.gmv)}</td>
                    </tr>
                  ))}
                  {!mtStatuses.length && <EmptyTableRow colSpan={3} />}
                </tbody>
              </table>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
