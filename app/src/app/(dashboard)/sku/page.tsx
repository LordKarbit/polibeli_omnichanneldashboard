'use client';

import type { EChartsOption } from 'echarts';
import { BarChart3, Layers, Package, Tag } from 'lucide-react';
import { useMemo } from 'react';

import { EChart } from '@/components/charts/echart';
import { ChartCard } from '@/components/ui/chart-card';
import { KPICard } from '@/components/ui/kpi-card';
import { mergeChartOptions } from '@/lib/chart-config';
import { type SkuSummary, useDashboardData } from '@/lib/dashboard-client';
import { abbreviateIDR, formatIDR, formatNumber } from '@/lib/format';
import { chartColors } from '@/lib/theme';

type SkuChannelKey = 'gtGMV' | 'mtGMV' | 'shopee' | 'tiktok1' | 'tiktok2';

const skuChannelFields: Array<{ key: SkuChannelKey; label: string; color: string }> = [
  { key: 'gtGMV', label: 'GT', color: chartColors.channels.gt },
  { key: 'mtGMV', label: 'MT', color: chartColors.channels.mt },
  { key: 'shopee', label: 'Shopee', color: chartColors.channels.shopee },
  { key: 'tiktok1', label: 'TikTok ID', color: chartColors.channels.tiktok1 },
  { key: 'tiktok2', label: 'TikTok Card', color: chartColors.channels.tiktok2 },
];

function shortName(value: string, maxLength = 28) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function sortByGMV(skus: SkuSummary[]) {
  return [...skus].sort((a, b) => b.totalGMV - a.totalGMV);
}

function getTopSKUBarOption(skus: SkuSummary[]): EChartsOption {
  const sorted = sortByGMV(skus).slice(0, 10);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ dataIndex: number; value: number }>)[0];
        const sku = sorted[p.dataIndex];
        return `<strong>${sku?.skuName ?? 'SKU'}</strong><br/>
          Total GMV: ${formatIDR(p.value)}<br/>
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
          value: sku.totalGMV,
          itemStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: `${chartColors.primary[index % chartColors.primary.length]}70` },
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

function getSKUTypeDonutOption(skus: SkuSummary[]): EChartsOption {
  const grouped = Array.from(
    skus.reduce((map, sku) => {
      const key = sku.skuType || 'Uncategorized';
      map.set(key, (map.get(key) ?? 0) + sku.totalGMV);
      return map;
    }, new Map<string, number>()),
  )
    .map(([type, value]) => ({ type, value }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>${formatIDR(p.value)}<br/>${p.percent}%`;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['44%', '70%'],
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
        data: grouped.map((row, index) => ({
          value: row.value,
          name: row.type,
          itemStyle: { color: chartColors.primary[index % chartColors.primary.length] },
        })),
      },
    ],
  });
}

function getChannelShareOption(skus: SkuSummary[]): EChartsOption {
  const rows = skuChannelFields
    .map((field) => ({
      label: field.label,
      value: skus.reduce((total, sku) => total + Number(sku[field.key] ?? 0), 0),
      color: field.color,
    }))
    .filter((row) => row.value > 0);

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>${formatIDR(p.value)}<br/>${p.percent}%`;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['0%', '68%'],
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 5, borderColor: 'rgba(0,0,0,0.35)', borderWidth: 2 },
        label: {
          color: 'rgba(255,255,255,0.9)',
          formatter: '{b}\n{d}%',
          fontSize: 11,
          fontWeight: 700,
        },
        data: rows.map((row) => ({
          value: row.value,
          name: row.label,
          itemStyle: { color: row.color },
        })),
      },
    ],
  });
}

function getChannelMatrixOption(skus: SkuSummary[]): EChartsOption {
  const sorted = sortByGMV(skus).slice(0, 12);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const rows = params as Array<{ marker: string; seriesName: string; value: number }>;
        const total = rows.reduce((sum, row) => sum + Number(row.value ?? 0), 0);
        return [
          `<strong>Total: ${formatIDR(total)}</strong>`,
          ...rows
            .filter((row) => row.value > 0)
            .map((row) => `${row.marker} ${row.seriesName}: ${formatIDR(row.value)}`),
        ].join('<br/>');
      },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 18, top: 12, bottom: 56, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map((sku) => shortName(sku.skuName, 18)),
      axisLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 10, rotate: 35 },
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
    series: skuChannelFields.map((field) => ({
      name: field.label,
      type: 'bar',
      stack: 'gmv',
      data: sorted.map((sku) => Number(sku[field.key] ?? 0)),
      itemStyle: { color: field.color },
      barWidth: '55%',
    })),
  });
}

function getBubbleOption(skus: SkuSummary[]): EChartsOption {
  const rows = sortByGMV(skus).slice(0, 30);

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number, string] };
        return `<strong>${p.data[3]}</strong><br/>
          GMV: ${formatIDR(p.data[0])}<br/>
          Quantity: ${formatNumber(p.data[1])}<br/>
          Orders: ${formatNumber(p.data[2])}`;
      },
    },
    grid: { left: 12, right: 24, top: 16, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'GMV',
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        formatter: (value: number) => abbreviateIDR(value),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      name: 'Qty',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (value: unknown) => {
          const data = value as number[];
          return Math.max(10, Math.min(44, Math.sqrt(Number(data[2] ?? 0)) * 5));
        },
        data: rows.map((sku, index) => ({
          value: [sku.totalGMV, sku.quantity, sku.orders, shortName(sku.skuName, 36)],
          itemStyle: {
            color: chartColors.primary[index % chartColors.primary.length],
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.25)',
          },
        })),
      },
    ],
  });
}

function EmptyTableRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td className="py-8 text-center text-sm text-muted-foreground" colSpan={colSpan}>
        No live SKU data for the current filter.
      </td>
    </tr>
  );
}

export default function SKUPage() {
  const { data, isLoading } = useDashboardData();
  const sortedSKUs = useMemo(() => sortByGMV(data?.skus ?? []), [data?.skus]);
  const totalSKUGMV = sortedSKUs.reduce((total, sku) => total + sku.totalGMV, 0);
  const uniqueSKUs = sortedSKUs.length;
  const topSKU = sortedSKUs[0];
  const averageGMV = uniqueSKUs ? totalSKUGMV / uniqueSKUs : 0;
  const productiveSKUs = sortedSKUs.filter((sku) => sku.totalGMV > 0).length;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label="Total SKU GMV"
          value={abbreviateIDR(totalSKUGMV)}
          icon={<Package className="h-5 w-5" />}
        />
        <KPICard label="Unique SKUs" value={formatNumber(uniqueSKUs)} icon={<Tag className="h-5 w-5" />} />
        <KPICard
          label="Top SKU"
          value={topSKU ? shortName(topSKU.skuName, 18) : isLoading ? 'Loading' : 'No data'}
          icon={<Layers className="h-5 w-5" />}
        />
        <KPICard
          label="Avg GMV/SKU"
          value={abbreviateIDR(averageGMV)}
          change={uniqueSKUs ? Math.round((productiveSKUs / uniqueSKUs) * 1000) / 10 : 0}
          changeLabel="productive SKUs"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top SKU by GMV" subtitle="Ranked from cleaned line-item GMV">
          <EChart option={getTopSKUBarOption(sortedSKUs)} style={{ height: 350 }} />
        </ChartCard>

        <ChartCard title="SKU Channel Mix" subtitle="GMV contribution by active channel">
          <EChart option={getChannelShareOption(sortedSKUs)} style={{ height: 350 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="SKU Type Distribution" subtitle="Clean GMV by normalized SKU type">
          <EChart option={getSKUTypeDonutOption(sortedSKUs)} style={{ height: 320 }} />
        </ChartCard>

        <ChartCard title="SKU Channel Matrix" subtitle="Top SKU contribution across GT, MT, and Marketplace">
          <EChart option={getChannelMatrixOption(sortedSKUs)} style={{ height: 320 }} />
        </ChartCard>
      </div>

      <ChartCard title="Quantity vs GMV" subtitle="Bubble size follows order count">
        <EChart option={getBubbleOption(sortedSKUs)} style={{ height: 320 }} />
      </ChartCard>

      <ChartCard title="SKU Channel Matrix Table" subtitle="Cleaned GMV by product and channel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">SKU</th>
                <th className="pb-3 pr-4 text-right">GT</th>
                <th className="pb-3 pr-4 text-right">MT</th>
                <th className="pb-3 pr-4 text-right">Shopee</th>
                <th className="pb-3 pr-4 text-right">TikTok ID</th>
                <th className="pb-3 text-right">TikTok Card</th>
              </tr>
            </thead>
            <tbody>
              {sortedSKUs.slice(0, 25).map((sku) => (
                <tr key={sku.skuCode} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-foreground">{sku.skuName}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{sku.skuCode}</div>
                  </td>
                  <td className="py-3 pr-4 text-right text-foreground">{sku.gtGMV > 0 ? formatIDR(sku.gtGMV) : '-'}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{sku.mtGMV > 0 ? formatIDR(sku.mtGMV) : '-'}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{sku.shopee > 0 ? formatIDR(sku.shopee) : '-'}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{sku.tiktok1 > 0 ? formatIDR(sku.tiktok1) : '-'}</td>
                  <td className="py-3 text-right text-foreground">{sku.tiktok2 > 0 ? formatIDR(sku.tiktok2) : '-'}</td>
                </tr>
              ))}
              {!sortedSKUs.length && <EmptyTableRow colSpan={6} />}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="SKU Performance Table" subtitle="All cleaned SKU rows available in current filters">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">SKU Code</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4 text-right">Total GMV</th>
                <th className="pb-3 pr-4 text-right">Qty</th>
                <th className="pb-3 pr-4 text-right">Orders</th>
                <th className="pb-3 text-right">Zero Value</th>
              </tr>
            </thead>
            <tbody>
              {sortedSKUs.map((sku) => (
                <tr key={sku.skuCode} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{sku.skuCode}</td>
                  <td className="max-w-[260px] truncate py-3 pr-4 font-medium text-foreground" title={sku.skuName}>
                    {sku.skuName}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{sku.skuType || 'Uncategorized'}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(sku.totalGMV)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatNumber(sku.quantity)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatNumber(sku.orders)}</td>
                  <td className="py-3 text-right text-foreground">{formatNumber(sku.zeroValueItems)}</td>
                </tr>
              ))}
              {!sortedSKUs.length && <EmptyTableRow colSpan={7} />}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
