'use client';

import { useMemo, useState } from 'react';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { abbreviateIDR, formatIDR, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  useDashboardData,
  type DashboardData,
  type CustomerRetentionChannel,
  type CustomerRetentionCustomer,
  type CustomerRetentionMonthly,
  type ManagerSummary,
  type SkuSummary,
} from '@/lib/dashboard-client';
import {
  BarChart3,
  CalendarDays,
  Gauge,
  Loader2,
  MapPin,
  MousePointer2,
  Network,
  Repeat2,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';

type ManagerLike = Pick<
  ManagerSummary,
  'name' | 'parentManager' | 'orders' | 'activeOrders' | 'bookedGMV' | 'activeGMV' | 'quantity' | 'customers'
> & {
  percentageOfGT?: number;
};

type SalesPerformance = {
  name: string;
  areaManager: string;
  regionalManager: string;
  orders: number;
  activeOrders: number;
  customers: number;
  cities: number;
  bookedGMV: number;
  activeGMV: number;
  cancellationValue: number;
  lastOrder: string | null;
};

type CityPerformance = {
  city: string;
  province: string;
  orders: number;
  customers: number;
  bookedGMV: number;
  activeGMV: number;
  areaManagers: number;
  sales: number;
};

type RegionalDonutRow = {
  name: string;
  bookedGMV: number;
  activeGMV: number;
  orders: number;
  customers: number;
  share: number;
  color: string;
};

const ALL = '__all__';
const emptyRetentionChannel: CustomerRetentionChannel = {
  channel: 'GT',
  channelKey: 'gt',
  uniqueCustomers: 0,
  oneTimeCustomers: 0,
  twoTimeCustomers: 0,
  threeToFiveCustomers: 0,
  sixPlusCustomers: 0,
  repeatCustomers: 0,
  returningCustomers: 0,
  repeatRate: 0,
  returningRate: 0,
  avgPurchaseFrequency: 0,
  totalOrders: 0,
  totalGMV: 0,
};

function compactText(value: string | null | undefined, max = 22) {
  const text = value?.trim() || 'Unassigned';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function getRegionalDonutRows(regionalManagersData: ManagerLike[]) {
  const ordered = [...regionalManagersData]
    .filter((manager) => manager.bookedGMV > 0)
    .sort((a, b) => b.bookedGMV - a.bookedGMV);
  const total = ordered.reduce((sum, manager) => sum + manager.bookedGMV, 0);

  return ordered.map<RegionalDonutRow>((manager, index) => ({
    name: manager.name,
    bookedGMV: manager.bookedGMV,
    activeGMV: manager.activeGMV,
    orders: manager.orders,
    customers: manager.customers,
    share: total ? (manager.bookedGMV / total) * 100 : 0,
    color: chartColors.primary[index % chartColors.primary.length],
  }));
}

function isCancelled(status: string | null | undefined) {
  const value = String(status ?? '').toLowerCase();
  return value.includes('cancel') || value.includes('refund') || value.includes('return');
}

function periodLabel(start?: string | null, end?: string | null) {
  if (!start || !end || start === 'Unknown' || end === 'Unknown') return 'Current GT filter period';
  if (start === end) return start;
  return `${start} to ${end}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function getAreaManagerOption(areaManagersData: ManagerLike[], selectedAreaManager: string): EChartsOption {
  const ordered = [...areaManagersData].sort((a, b) => b.bookedGMV - a.bookedGMV).slice(0, 14);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const row = (params as Array<{ dataIndex: number }>)[0];
        const manager = ordered[row?.dataIndex ?? 0];
        if (!manager) return '';
        return [
          `<strong>${manager.name}</strong>`,
          `Booked GMV: ${formatIDR(manager.bookedGMV)}`,
          `Active GMV: ${formatIDR(manager.activeGMV)}`,
          `Orders: ${formatNumber(manager.orders)}`,
          `Customers: ${formatNumber(manager.customers)}`,
        ].join('<br/>');
      },
    },
    grid: { left: 8, right: 24, top: 8, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: ordered.map((manager) => manager.name),
      axisLabel: {
        color: 'rgba(255,255,255,0.68)',
        fontSize: 10,
        width: 110,
        overflow: 'truncate',
        formatter: (value: string) => compactText(value, 18),
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Booked GMV',
        type: 'bar',
        barWidth: '56%',
        data: ordered.map((manager, index) => ({
          value: manager.bookedGMV,
          itemStyle: {
            color:
              selectedAreaManager !== ALL && selectedAreaManager !== manager.name
                ? 'rgba(100,116,139,0.35)'
                : chartColors.primary[index % chartColors.primary.length],
            borderRadius: [0, 6, 6, 0],
          },
        })),
      },
    ],
  });
}

function getSalesLeaderboardOption(salesData: SalesPerformance[], selectedSales: string): EChartsOption {
  const ordered = [...salesData].sort((a, b) => b.bookedGMV - a.bookedGMV).slice(0, 14);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const row = (params as Array<{ dataIndex: number }>)[0];
        const sales = ordered[row?.dataIndex ?? 0];
        if (!sales) return '';
        return [
          `<strong>${sales.name}</strong>`,
          `Area Manager: ${sales.areaManager}`,
          `Booked GMV: ${formatIDR(sales.bookedGMV)}`,
          `Active GMV: ${formatIDR(sales.activeGMV)}`,
          `Customers: ${formatNumber(sales.customers)}`,
          `Cities: ${formatNumber(sales.cities)}`,
        ].join('<br/>');
      },
    },
    legend: { top: 0, right: 0, textStyle: { color: 'rgba(255,255,255,0.68)', fontSize: 11 } },
    grid: { left: 8, right: 24, top: 34, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: ordered.map((sales) => sales.name),
      axisLabel: {
        color: 'rgba(255,255,255,0.68)',
        fontSize: 10,
        width: 120,
        overflow: 'truncate',
        formatter: (value: string) => compactText(value, 18),
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Booked',
        type: 'bar',
        barWidth: '42%',
        data: ordered.map((sales, index) => ({
          value: sales.bookedGMV,
          itemStyle: {
            color:
              selectedSales !== ALL && selectedSales !== sales.name
                ? 'rgba(100,116,139,0.32)'
                : chartColors.primary[(index + 1) % chartColors.primary.length],
            borderRadius: [0, 6, 6, 0],
          },
        })),
      },
      {
        name: 'Active',
        type: 'bar',
        barWidth: '42%',
        data: ordered.map((sales) => ({
          value: sales.activeGMV,
          itemStyle: { color: 'rgba(52,211,153,0.62)', borderRadius: [0, 6, 6, 0] },
        })),
      },
    ],
  });
}

function getRegionalOption(regionalManagersData: ManagerLike[], selectedRegionalManager = ALL): EChartsOption {
  const ordered = [...regionalManagersData].sort((a, b) => b.bookedGMV - a.bookedGMV).slice(0, 10);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: unknown) => {
        const rows = params as Array<{ axisValue: string; marker: string; seriesName: string; value: number }>;
        return [
          `<strong>${rows[0]?.axisValue ?? ''}</strong>`,
          ...rows.map((row) => {
            const value = row.seriesName === 'Orders' ? formatNumber(row.value) : formatIDR(row.value);
            return `${row.marker} ${row.seriesName}: ${value}`;
          }),
        ].join('<br/>');
      },
    },
    legend: { top: 0, right: 0, textStyle: { color: 'rgba(255,255,255,0.68)', fontSize: 11 } },
    grid: { left: 10, right: 18, top: 36, bottom: 34, containLabel: true },
    xAxis: {
      type: 'category',
      data: ordered.map((manager) => manager.name),
      axisLabel: {
        color: 'rgba(255,255,255,0.58)',
        fontSize: 10,
        width: 74,
        overflow: 'truncate',
        formatter: (value: string) => compactText(value, 12),
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.42)', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Booked GMV',
        type: 'bar',
        barWidth: '36%',
        data: ordered.map((manager) => ({
          value: manager.bookedGMV,
          itemStyle: {
            color:
              selectedRegionalManager !== ALL && selectedRegionalManager !== manager.name
                ? 'rgba(100,116,139,0.35)'
                : chartColors.channels.gt,
            borderRadius: [5, 5, 0, 0],
          },
        })),
      },
      {
        name: 'Active GMV',
        type: 'bar',
        barWidth: '36%',
        data: ordered.map((manager) => ({
          value: manager.activeGMV,
          itemStyle: {
            color:
              selectedRegionalManager !== ALL && selectedRegionalManager !== manager.name
                ? 'rgba(100,116,139,0.24)'
                : '#34d399',
            borderRadius: [5, 5, 0, 0],
          },
        })),
      },
      {
        name: 'Orders',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 7,
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
        data: ordered.map((manager) => manager.orders),
      },
    ],
  });
}

function getRegionalDonutOption(regionalManagersData: ManagerLike[], selectedRegionalManager = ALL): EChartsOption {
  const rows = getRegionalDonutRows(regionalManagersData);

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number; dataIndex: number };
        const manager = rows[p.dataIndex];
        if (!manager) return '';
        return [
          `<strong style="font-size:13px">${manager.name}</strong>`,
          `<span style="color:#a5b4fc">Share</span>: <strong>${formatPercent(p.percent)}</strong>`,
          `<span style="color:#a5b4fc">Booked GMV</span>: ${formatIDR(manager.bookedGMV)}`,
          `<span style="color:#a5b4fc">Active GMV</span>: ${formatIDR(manager.activeGMV)}`,
          `<span style="color:#a5b4fc">Orders</span>: ${formatNumber(manager.orders)}`,
          `<span style="color:#a5b4fc">Customers</span>: ${formatNumber(manager.customers)}`,
        ].join('<br/>');
      },
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: 'Regional GMV',
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '50%'],
        minAngle: 3,
        minShowLabelAngle: 11,
        clockwise: true,
        stillShowZeroSum: false,
        selectedMode: 'single',
        selectedOffset: 7,
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: 'rgba(2,6,23,0.94)',
          borderWidth: 4,
          borderRadius: 10,
        },
        label: {
          show: true,
          position: 'inside',
          color: '#ffffff',
          formatter: (params: unknown) => {
            const p = params as { percent: number };
            return `{percent|${formatPercent(p.percent)}}`;
          },
          rich: {
            percent: {
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 900,
              lineHeight: 20,
              textShadowColor: 'rgba(0,0,0,0.42)',
              textShadowBlur: 5,
            },
          },
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 5,
          label: {
            show: true,
            fontSize: 18,
            fontWeight: 900,
          },
          itemStyle: { shadowBlur: 22, shadowColor: 'rgba(6,182,212,0.28)' },
        },
        blur: {
          itemStyle: { opacity: 0.34 },
        },
        data: rows.map((manager) => {
          const isSelected = selectedRegionalManager === manager.name;
          const isDimmed = selectedRegionalManager !== ALL && !isSelected;

          return {
            name: manager.name,
            value: manager.bookedGMV,
            selected: isSelected,
            itemStyle: {
              color: manager.color,
              opacity: isDimmed ? 0.28 : 1,
            },
          };
        }),
      },
    ],
    media: [
      {
        query: { maxWidth: 520 },
        option: {
          series: [
            {
              radius: ['51%', '76%'],
              center: ['50%', '49%'],
              selectedOffset: 4,
              label: {
                show: true,
                rich: {
                  percent: { fontSize: 12, lineHeight: 16, fontWeight: 900 },
                },
              },
            },
          ],
        },
      },
      {
        query: { minWidth: 900 },
        option: {
          series: [
            {
              radius: ['56%', '82%'],
              center: ['50%', '50%'],
              label: {
                rich: {
                  percent: { fontSize: 17, lineHeight: 22, fontWeight: 900 },
                },
              },
            },
          ],
        },
      },
    ],
  });
}

function getRetentionMonthlyOption(monthly: CustomerRetentionMonthly[]): EChartsOption {
  const ordered = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const labels = ordered.map((month) => month.monthLabel);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const rows = params as Array<{ dataIndex: number; marker: string; seriesName: string; value: number }>;
        const item = ordered[rows[0]?.dataIndex ?? 0];
        if (!item) return '';
        return [
          `<strong>${item.monthLabel}</strong>`,
          `Repeat rate: ${formatPercent(item.repeatRate)}`,
          `Returning rate: ${formatPercent(item.returningRate)}`,
          ...rows.map((row) => {
            const value = row.seriesName === 'Repeat Rate' ? formatPercent(row.value) : formatNumber(row.value);
            return `${row.marker} ${row.seriesName}: ${value}`;
          }),
        ].join('<br/>');
      },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.68)', fontSize: 11 } },
    grid: { left: 10, right: 18, top: 18, bottom: 50, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 10, rotate: labels.length > 5 ? 25 : 0 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      {
        type: 'value',
        max: 100,
        axisLabel: { color: 'rgba(255,255,255,0.42)', fontSize: 10, formatter: (value: number) => `${value}%` },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '1x Buyer',
        type: 'bar',
        stack: 'customers',
        data: ordered.map((month) => month.oneTimeCustomers),
        itemStyle: { color: 'rgba(148,163,184,0.55)' },
      },
      {
        name: '2x Buyer',
        type: 'bar',
        stack: 'customers',
        data: ordered.map((month) => month.twoTimeCustomers),
        itemStyle: { color: '#22d3ee' },
      },
      {
        name: '3-5x Buyer',
        type: 'bar',
        stack: 'customers',
        data: ordered.map((month) => month.threeToFiveCustomers),
        itemStyle: { color: '#8b5cf6' },
      },
      {
        name: '6x+ Buyer',
        type: 'bar',
        stack: 'customers',
        data: ordered.map((month) => month.sixPlusCustomers),
        itemStyle: { color: '#f59e0b', borderRadius: [5, 5, 0, 0] },
      },
      {
        name: 'Repeat Rate',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 7,
        lineStyle: { color: '#34d399', width: 2 },
        itemStyle: { color: '#34d399' },
        data: ordered.map((month) => month.repeatRate),
      },
    ],
  });
}

function getSkuParetoOption(skus: SkuSummary[]): EChartsOption {
  const topSkus = [...skus]
    .filter((sku) => sku.gtGMV > 0)
    .sort((a, b) => b.gtGMV - a.gtGMV)
    .slice(0, 12);
  const total = topSkus.reduce((sum, sku) => sum + sku.gtGMV, 0);
  let cumulative = 0;
  const cumulativeData = topSkus.map((sku) => {
    cumulative += sku.gtGMV;
    return total ? (cumulative / total) * 100 : 0;
  });

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const rows = params as Array<{ dataIndex: number; marker: string; seriesName: string; value: number }>;
        const sku = topSkus[rows[0]?.dataIndex ?? 0];
        if (!sku) return '';
        return [
          `<strong>${sku.skuName}</strong>`,
          `GT GMV: ${formatIDR(sku.gtGMV)}`,
          `Quantity: ${formatNumber(sku.quantity)}`,
          `Orders: ${formatNumber(sku.orders)}`,
          ...rows.map((row) => {
            const value = row.seriesName === 'Cumulative' ? formatPercent(row.value) : formatIDR(row.value);
            return `${row.marker} ${row.seriesName}: ${value}`;
          }),
        ].join('<br/>');
      },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.68)', fontSize: 11 } },
    grid: { left: 10, right: 18, top: 18, bottom: 64, containLabel: true },
    xAxis: {
      type: 'category',
      data: topSkus.map((sku) => sku.skuName),
      axisLabel: {
        color: 'rgba(255,255,255,0.58)',
        fontSize: 9,
        rotate: 26,
        width: 86,
        overflow: 'truncate',
        formatter: (value: string) => compactText(value, 14),
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      {
        type: 'value',
        max: 100,
        axisLabel: { color: 'rgba(255,255,255,0.42)', fontSize: 10, formatter: (value: number) => `${value}%` },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'GT GMV',
        type: 'bar',
        barWidth: '48%',
        data: topSkus.map((sku, index) => ({
          value: sku.gtGMV,
          itemStyle: { color: chartColors.primary[index % chartColors.primary.length], borderRadius: [5, 5, 0, 0] },
        })),
      },
      {
        name: 'Cumulative',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 7,
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
        data: cumulativeData,
      },
    ],
  });
}

function getCityOption(cities: CityPerformance[]): EChartsOption {
  const ordered = [...cities].sort((a, b) => b.bookedGMV - a.bookedGMV).slice(0, 12);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const row = (params as Array<{ dataIndex: number }>)[0];
        const city = ordered[row?.dataIndex ?? 0];
        if (!city) return '';
        return [
          `<strong>${city.city}, ${city.province}</strong>`,
          `Booked GMV: ${formatIDR(city.bookedGMV)}`,
          `Orders: ${formatNumber(city.orders)}`,
          `Customers: ${formatNumber(city.customers)}`,
          `AM coverage: ${formatNumber(city.areaManagers)}`,
          `Sales coverage: ${formatNumber(city.sales)}`,
        ].join('<br/>');
      },
    },
    grid: { left: 8, right: 24, top: 8, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: ordered.map((city) => `${city.city}, ${city.province}`),
      axisLabel: {
        color: 'rgba(255,255,255,0.68)',
        fontSize: 10,
        width: 116,
        overflow: 'truncate',
        formatter: (value: string) => compactText(value, 18),
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'GT GMV',
        type: 'bar',
        barWidth: '56%',
        data: ordered.map((city, index) => ({
          value: city.bookedGMV,
          itemStyle: { color: chartColors.primary[(index + 2) % chartColors.primary.length], borderRadius: [0, 6, 6, 0] },
        })),
      },
    ],
  });
}

function GtMetricCard({
  label,
  value,
  meta,
  icon,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  meta: string;
  icon: React.ReactNode;
  tone?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';
}) {
  const toneClass = {
    cyan: 'border-cyan-400/30 bg-cyan-400/8 text-cyan-100',
    emerald: 'border-emerald-400/30 bg-emerald-400/8 text-emerald-100',
    violet: 'border-violet-400/30 bg-violet-400/8 text-violet-100',
    amber: 'border-amber-400/30 bg-amber-400/8 text-amber-100',
    rose: 'border-rose-400/30 bg-rose-400/8 text-rose-100',
  }[tone];

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-400 to-orange-300 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold leading-tight text-foreground">{value}</p>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{meta}</p>
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border', toneClass)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function NoDataBlock({ label = 'No GT data in the current filter.' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[240px] items-center justify-center rounded-[8px] border border-dashed border-border bg-muted/10 p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export default function GTPerformanceClient({ initialData }: { initialData?: DashboardData | null }) {
  const { data: liveData, isLoading } = useDashboardData(0, { initialData });
  const data = liveData ?? initialData ?? null;
  const showLoading = isLoading && !data;
  const [selectedRegionalManager, setSelectedRegionalManager] = useState(ALL);
  const [selectedAreaManager, setSelectedAreaManager] = useState(ALL);
  const [selectedSalesName, setSelectedSalesName] = useState(ALL);
  const [tableSearch, setTableSearch] = useState('');

  const liveRegionalManagers = useMemo(
    () => (data?.managers.regional ?? []) as ManagerLike[],
    [data?.managers.regional],
  );
  const liveAreaManagers = useMemo(
    () => (data?.managers.area ?? []) as ManagerLike[],
    [data?.managers.area],
  );
  const gtTransactions = useMemo(
    () => data?.gtPerformance.transactions ?? [],
    [data?.gtPerformance.transactions],
  );
  const gtSales = useMemo(
    () => (data?.gtPerformance.salesPerformance ?? []) as SalesPerformance[],
    [data?.gtPerformance.salesPerformance],
  );
  const gtCities = useMemo(
    () => (data?.gtPerformance.cityPerformance ?? []) as CityPerformance[],
    [data?.gtPerformance.cityPerformance],
  );
  const gtSkus = useMemo(() => (data?.skus ?? []).filter((sku) => sku.gtGMV > 0), [data]);
  const gtRetentionChannel = useMemo(
    () => data?.customerRetentionAnalytics.channels.find((channel) => channel.channelKey === 'gt') ?? emptyRetentionChannel,
    [data],
  );
  const gtRetentionMonthly = useMemo(
    () => (data?.customerRetentionAnalytics.monthly ?? []).filter((month) => month.channelKey === 'gt'),
    [data],
  );
  const gtRetentionCustomers = useMemo(
    () => (data?.customerRetentionAnalytics.customers ?? []).filter((customer) => customer.channelKey === 'gt'),
    [data],
  );

  const sortedRegionalManagers = useMemo(
    () => [...liveRegionalManagers].sort((a, b) => b.bookedGMV - a.bookedGMV),
    [liveRegionalManagers],
  );
  const regionalDonutRows = useMemo(() => getRegionalDonutRows(liveRegionalManagers), [liveRegionalManagers]);
  const regionalDonutTotal = regionalDonutRows.reduce((sum, row) => sum + row.bookedGMV, 0);
  const selectedRegionalDonutRow =
    selectedRegionalManager === ALL ? null : regionalDonutRows.find((row) => row.name === selectedRegionalManager) ?? null;
  const donutCenterValue = selectedRegionalDonutRow?.bookedGMV ?? regionalDonutTotal;
  const donutCenterLabel = selectedRegionalDonutRow ? 'Selected RM GMV' : 'Regional GT GMV';
  const regionalScopedAreaManagers = useMemo(
    () =>
      selectedRegionalManager === ALL
        ? liveAreaManagers
        : liveAreaManagers.filter((manager) => manager.parentManager === selectedRegionalManager),
    [liveAreaManagers, selectedRegionalManager],
  );
  const regionalScopedTransactions = useMemo(
    () =>
      selectedRegionalManager === ALL
        ? gtTransactions
        : gtTransactions.filter((order) => order.regionalManager === selectedRegionalManager),
    [gtTransactions, selectedRegionalManager],
  );
  const regionalScopedSales = useMemo(
    () =>
      selectedRegionalManager === ALL
        ? gtSales
        : gtSales.filter((sales) => sales.regionalManager === selectedRegionalManager),
    [gtSales, selectedRegionalManager],
  );
  const scopedSales = useMemo(
    () =>
      selectedAreaManager === ALL
        ? regionalScopedSales
        : regionalScopedSales.filter((sales) => sales.areaManager === selectedAreaManager),
    [regionalScopedSales, selectedAreaManager],
  );
  const scopedTransactions = useMemo(
    () =>
      selectedAreaManager === ALL
        ? regionalScopedTransactions
        : regionalScopedTransactions.filter((order) => order.areaManager === selectedAreaManager),
    [regionalScopedTransactions, selectedAreaManager],
  );
  const selectedSales = useMemo(
    () => (selectedSalesName === ALL ? null : regionalScopedSales.find((sales) => sales.name === selectedSalesName) ?? null),
    [regionalScopedSales, selectedSalesName],
  );
  const visibleTransactions = useMemo(
    () =>
      selectedSales
        ? scopedTransactions.filter((order) => (order.salesName?.trim() || 'Unassigned BD') === selectedSales.name)
        : scopedTransactions,
    [scopedTransactions, selectedSales],
  );
  const filteredTransactions = useMemo(() => {
    const needle = tableSearch.trim().toLowerCase();
    if (!needle) return visibleTransactions;
    return visibleTransactions.filter((order) =>
      [order.customer, order.city, order.province, order.areaManager, order.salesName, order.sourceOrderId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [tableSearch, visibleTransactions]);

  const gtChannel = data?.channels.find((channel) => channel.channelKey === 'gt');
  const gtSummary = data?.gtPerformance.summary;
  const totalGTGMV = gtSummary?.bookedGMV ?? gtChannel?.bookedGMV ?? liveRegionalManagers.reduce((sum, manager) => sum + manager.bookedGMV, 0);
  const activeGTGMV = gtSummary?.activeGMV ?? gtChannel?.activeGMV ?? liveRegionalManagers.reduce((sum, manager) => sum + manager.activeGMV, 0);
  const totalGTOrders = gtSummary?.orders ?? gtChannel?.orders ?? liveRegionalManagers.reduce((sum, manager) => sum + manager.orders, 0);
  const activeGTOrders = gtSummary?.activeOrders ?? gtChannel?.activeOrders ?? liveRegionalManagers.reduce((sum, manager) => sum + manager.activeOrders, 0);
  const totalGTCustomers = gtSummary?.customers ?? gtRetentionChannel.uniqueCustomers;
  const activeRate = totalGTGMV ? (activeGTGMV / totalGTGMV) * 100 : 0;
  const orderActiveRate = totalGTOrders ? (activeGTOrders / totalGTOrders) * 100 : 0;
  const topRegional = sortedRegionalManagers[0];
  const secondRegional = sortedRegionalManagers[1];
  const regionalShare = topRegional && totalGTGMV ? (topRegional.bookedGMV / totalGTGMV) * 100 : 0;
  const regionalGap = topRegional && secondRegional ? topRegional.bookedGMV - secondRegional.bookedGMV : 0;
  const selectedRegional = selectedRegionalManager === ALL ? topRegional : sortedRegionalManagers.find((manager) => manager.name === selectedRegionalManager);
  const selectedRegionalActiveRate = selectedRegional?.bookedGMV ? (selectedRegional.activeGMV / selectedRegional.bookedGMV) * 100 : 0;
  const selectedRegionalAreaCount =
    selectedRegionalManager === ALL ? liveAreaManagers.length : regionalScopedAreaManagers.length;
  const selectedRegionalSalesCount =
    selectedRegionalManager === ALL ? gtSales.length : regionalScopedSales.length;
  const topArea = regionalScopedAreaManagers[0] ?? liveAreaManagers[0];
  const topSales = regionalScopedSales[0] ?? gtSales[0];
  const topCity = gtCities[0];
  const period = periodLabel(gtSummary?.dateRange.start, gtSummary?.dateRange.end);
  const focusLabel =
    selectedSales?.name ??
    (selectedAreaManager !== ALL
      ? `AM ${selectedAreaManager}`
      : selectedRegionalManager !== ALL
        ? `Regional ${selectedRegionalManager}`
        : 'All GT territories');

  function resetFocus() {
    setSelectedRegionalManager(ALL);
    setSelectedAreaManager(ALL);
    setSelectedSalesName(ALL);
    setTableSearch('');
  }

  function handleRegionalClick(params: unknown) {
    const click = params as { name?: string };
    const name = click.name;
    if (!name) return;
    setSelectedRegionalManager((current) => (current === name ? ALL : name));
    setSelectedAreaManager(ALL);
    setSelectedSalesName(ALL);
  }

  function handleAreaClick(params: unknown) {
    const click = params as { name?: string };
    const name = click.name;
    if (!name) return;
    setSelectedAreaManager((current) => (current === name ? ALL : name));
    setSelectedSalesName(ALL);
  }

  function handleSalesClick(params: unknown) {
    const click = params as { name?: string };
    const name = click.name;
    if (!name) return;
    setSelectedSalesName((current) => (current === name ? ALL : name));
  }

  return (
    <div className="relative animate-fade-in-up space-y-4 sm:space-y-5 lg:space-y-6">
      {showLoading ? (
        <div className="sticky top-20 z-30 flex items-center gap-2 rounded-[8px] border border-primary/25 bg-card/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading GT performance...
        </div>
      ) : null}

      <section className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(320px,0.58fr)]">
        <ChartCard
          title="Regional Manager Comparison"
          subtitle="Clean GT GMV contribution and drilldown by Regional Manager"
          contentClassName="p-3 sm:p-4"
          action={
            selectedRegionalManager !== ALL ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedRegionalManager(ALL);
                  setSelectedAreaManager(ALL);
                  setSelectedSalesName(ALL);
                }}
                className="rounded-[8px] border border-border bg-muted/20 px-2.5 py-1 text-xs text-foreground transition hover:border-primary/40"
              >
                Clear Regional
              </button>
            ) : null
          }
        >
          {regionalDonutRows.length ? (
            <div className="grid min-w-0 gap-3 2xl:grid-cols-[minmax(300px,0.92fr)_minmax(280px,0.72fr)] 2xl:items-center">
              <div className="relative min-w-0 overflow-hidden rounded-[8px] border border-border/80 bg-background/30">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex w-[46%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
                  <p className="text-lg font-black leading-none text-foreground drop-shadow-[0_0_18px_rgba(6,182,212,0.26)] sm:text-2xl lg:text-3xl">
                    {abbreviateIDR(donutCenterValue)}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold leading-4 text-muted-foreground sm:text-xs">
                    {donutCenterLabel}
                  </p>
                </div>
                <EChart
                  option={getRegionalDonutOption(liveRegionalManagers, selectedRegionalManager)}
                  onClick={handleRegionalClick}
                  style={{ height: 'clamp(300px, 38vw, 460px)', minHeight: 300 }}
                />
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Regional Share
                    </p>
                    <p className="mt-1 text-2xl font-semibold leading-tight text-foreground sm:text-[28px]">
                      {abbreviateIDR(regionalDonutTotal)}
                    </p>
                  </div>
                  <span className="w-fit rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                    {formatNumber(regionalDonutRows.length)} RM
                  </span>
                </div>

                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1 2xl:max-h-[410px]">
                  {regionalDonutRows.map((row, index) => {
                    const isSelected = selectedRegionalManager === row.name;
                    const isDimmed = selectedRegionalManager !== ALL && !isSelected;

                    return (
                      <button
                        key={row.name}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedRegionalManager((current) => (current === row.name ? ALL : row.name));
                          setSelectedAreaManager(ALL);
                          setSelectedSalesName(ALL);
                        }}
                        className={cn(
                          'group w-full min-w-0 rounded-[8px] border p-2.5 text-left transition',
                          isSelected
                            ? 'border-cyan-300/55 bg-cyan-300/10 shadow-sm shadow-cyan-950/30'
                            : 'border-border bg-muted/10 hover:border-primary/35 hover:bg-muted/18',
                          isDimmed && 'opacity-55',
                        )}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-1 flex shrink-0 items-center gap-2">
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span
                              className="h-3 w-3 rounded-full ring-2 ring-white/10"
                              style={{ backgroundColor: row.color, boxShadow: `0 0 18px ${row.color}55` }}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <p className="min-w-0 break-words text-sm font-semibold leading-5 text-foreground sm:text-base">
                                {row.name}
                              </p>
                              <span className="shrink-0 text-xl font-black leading-none text-foreground">
                                {formatPercent(row.share)}
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/70">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(row.share, 2)}%`, backgroundColor: row.color }}
                              />
                            </div>

                            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] leading-4 text-muted-foreground">
                              <span className="min-w-0">
                                <strong className="block truncate text-xs text-foreground">{abbreviateIDR(row.bookedGMV)}</strong>
                                GMV
                              </span>
                              <span className="min-w-0">
                                <strong className="block truncate text-xs text-foreground">{formatNumber(row.orders)}</strong>
                                Orders
                              </span>
                              <span className="min-w-0">
                                <strong className="block truncate text-xs text-foreground">{formatNumber(row.customers)}</strong>
                                Customers
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <NoDataBlock />
          )}
        </ChartCard>

        <div className="grid h-fit self-start gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <div className="relative overflow-hidden rounded-[8px] border border-border bg-card p-3 shadow-sm shadow-black/10 sm:col-span-2">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-400 to-orange-300" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Top Regional Manager</p>
                <p className="mt-1 truncate text-xl font-semibold text-foreground">{topRegional?.name ?? 'N/A'}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {topRegional ? `${abbreviateIDR(topRegional.bookedGMV)} GMV, ${formatPercent(regionalShare)} of GT` : 'No regional data'}
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-cyan-400/30 bg-cyan-400/8 text-cyan-100">
                <Trophy className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div className="rounded-[8px] border border-border bg-card p-3 shadow-sm shadow-black/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Regional Gap</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{abbreviateIDR(Math.max(0, regionalGap))}</p>
              <p className="mt-1 text-xs text-muted-foreground">Top vs second RM</p>
            </div>
            <div className="rounded-[8px] border border-border bg-card p-3 shadow-sm shadow-black/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Selected Active</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatPercent(selectedRegionalActiveRate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{selectedRegional?.name ?? 'All regional'}</p>
            </div>
          </div>

          <div className="rounded-[8px] border border-border bg-card p-3 shadow-sm shadow-black/10 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Regional Drilldown Scope</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-[8px] border border-border bg-muted/10 p-2.5">
                <p className="text-xs text-muted-foreground">Area Managers</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(selectedRegionalAreaCount)}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-muted/10 p-2.5">
                <p className="text-xs text-muted-foreground">BD/Sales</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(selectedRegionalSalesCount)}</p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Click a regional bar to make AM, BD/sales, and transaction drilldown follow that regional context.
            </p>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="relative min-w-0 overflow-hidden rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10 sm:p-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-400 to-orange-300" />
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-400/25 bg-cyan-400/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                  <Store className="h-3.5 w-3.5" />
                  GT Field Command
                </span>
                <span className="rounded-[8px] border border-border bg-muted/25 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {period}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-1 text-[11px] text-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Giveaway SKUs excluded
                </span>
              </div>
              <h2 className="mt-4 max-w-3xl break-words text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                {abbreviateIDR(totalGTGMV)} GT GMV across {formatNumber(liveAreaManagers.length)} area managers and{' '}
                {formatNumber(gtSales.length)} BD/sales.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Focus is currently on <span className="font-semibold text-foreground">{focusLabel}</span>. Top contributor is{' '}
                <span className="font-semibold text-foreground">{topArea?.name ?? 'N/A'}</span>
                {topSales ? `, with ${topSales.name} leading BD/sales contribution.` : '.'}
              </p>
            </div>

            <div className="grid w-full min-w-0 grid-cols-3 gap-2 lg:w-auto lg:min-w-[260px]">
              <div className="rounded-[8px] border border-border bg-muted/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Active</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatPercent(activeRate)}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-muted/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Repeat</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatPercent(gtRetentionChannel.repeatRate)}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-muted/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Top City</p>
                <p className="mt-1 truncate text-lg font-semibold text-foreground">{topCity?.city ?? 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetFocus}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-border bg-muted/20 px-3 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/10"
            >
              <Target className="h-3.5 w-3.5" />
              Reset focus
            </button>
            {[...regionalScopedAreaManagers].slice(0, 8).map((manager) => {
              const isSelected = selectedAreaManager === manager.name;
              return (
                <button
                  key={manager.name}
                  type="button"
                  onClick={() => {
                    setSelectedAreaManager(isSelected ? ALL : manager.name);
                    setSelectedSalesName(ALL);
                  }}
                  className={cn(
                    'inline-flex h-9 max-w-[190px] items-center gap-2 rounded-[8px] border px-3 text-xs font-medium transition',
                    isSelected
                      ? 'border-cyan-300/70 bg-cyan-500/12 text-cyan-100'
                      : 'border-border bg-muted/10 text-muted-foreground hover:border-primary/35 hover:text-foreground',
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  <span className="truncate">{manager.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="relative overflow-hidden rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Retention Pulse</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatPercent(gtRetentionChannel.repeatRate)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-emerald-400/30 bg-emerald-400/8 text-emerald-100">
                <Repeat2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {[
                { label: '1x', value: gtRetentionChannel.oneTimeCustomers, color: 'bg-slate-400' },
                { label: '2x', value: gtRetentionChannel.twoTimeCustomers, color: 'bg-cyan-400' },
                { label: '3-5x', value: gtRetentionChannel.threeToFiveCustomers, color: 'bg-violet-400' },
                { label: '6x+', value: gtRetentionChannel.sixPlusCustomers, color: 'bg-amber-400' },
              ].map((bucket) => (
                <div key={bucket.label} className="rounded-[8px] border border-border bg-muted/10 p-2">
                  <div className={cn('mb-2 h-1 rounded-full', bucket.color)} />
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{bucket.label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatNumber(bucket.value)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-violet-400/30 bg-violet-400/8 text-violet-100">
                <MousePointer2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Interactive GT focus</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Click AM or BD chart bars to isolate transactions, customers, and territory performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GtMetricCard
          label="GT Booked GMV"
          value={abbreviateIDR(totalGTGMV)}
          meta={`${formatNumber(totalGTOrders)} orders, ${formatPercent(orderActiveRate)} active orders`}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <GtMetricCard
          label="Active GT GMV"
          value={abbreviateIDR(activeGTGMV)}
          meta={`${formatPercent(activeRate)} active GMV conversion`}
          icon={<Gauge className="h-5 w-5" />}
          tone="emerald"
        />
        <GtMetricCard
          label="GT Customers"
          value={formatNumber(totalGTCustomers)}
          meta={`${formatNumber(gtRetentionChannel.repeatCustomers)} repeat customers`}
          icon={<Users className="h-5 w-5" />}
          tone="violet"
        />
        <GtMetricCard
          label="BD/Sales Coverage"
          value={formatNumber(gtSummary?.sales ?? gtSales.length)}
          meta={`${formatNumber(gtSummary?.cities ?? gtCities.length)} active cities mapped`}
          icon={<Network className="h-5 w-5" />}
          tone="amber"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Area Manager GMV Command"
          subtitle="Click a bar to filter GT field performance"
          action={
            selectedAreaManager !== ALL ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedAreaManager(ALL);
                  setSelectedSalesName(ALL);
                }}
                className="rounded-[8px] border border-border bg-muted/20 px-2.5 py-1 text-xs text-foreground transition hover:border-primary/40"
              >
                Clear AM
              </button>
            ) : null
          }
        >
          {regionalScopedAreaManagers.length ? (
            <EChart option={getAreaManagerOption(regionalScopedAreaManagers, selectedAreaManager)} onClick={handleAreaClick} style={{ height: 390 }} />
          ) : (
            <NoDataBlock />
          )}
        </ChartCard>

        <ChartCard
          title="BD/Sales Leaderboard"
          subtitle="Booked vs active GMV, scoped by selected Area Manager"
          action={
            selectedSalesName !== ALL ? (
              <button
                type="button"
                onClick={() => setSelectedSalesName(ALL)}
                className="rounded-[8px] border border-border bg-muted/20 px-2.5 py-1 text-xs text-foreground transition hover:border-primary/40"
              >
                Clear sales
              </button>
            ) : null
          }
        >
          {scopedSales.length ? (
            <EChart option={getSalesLeaderboardOption(scopedSales, selectedSalesName)} onClick={handleSalesClick} style={{ height: 390 }} />
          ) : (
            <NoDataBlock label="No BD/sales data in this focus." />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard title="Regional Manager Performance" subtitle="Booked GMV, active GMV, and order velocity">
          {liveRegionalManagers.length ? <EChart option={getRegionalOption(liveRegionalManagers)} style={{ height: 360 }} /> : <NoDataBlock />}
        </ChartCard>

        <ChartCard title="Customer Retention by Month" subtitle="One-time vs repeat customer structure for GT">
          {gtRetentionMonthly.length ? (
            <EChart option={getRetentionMonthlyOption(gtRetentionMonthly)} style={{ height: 360 }} />
          ) : (
            <NoDataBlock label="Monthly retention appears after GT customer orders are uploaded." />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard title="GT SKU Pareto" subtitle="SKU contribution after excluding Scrach Card, Poster POSM, and MLBB Display Rack">
          {gtSkus.length ? <EChart option={getSkuParetoOption(gtSkus)} style={{ height: 360 }} /> : <NoDataBlock label="No paid GT SKU rows available." />}
        </ChartCard>

        <ChartCard title="City Demand Ranking" subtitle="GT GMV by active transaction city">
          {gtCities.length ? <EChart option={getCityOption(gtCities)} style={{ height: 360 }} /> : <NoDataBlock />}
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <ChartCard
          title="Area Manager Detail"
          subtitle="Ranked by clean GT GMV"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-muted/15 px-2.5 py-1 text-[11px] text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              Top {formatNumber(regionalScopedAreaManagers.length)}
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Area Manager</th>
                  <th className="pb-3 pr-4">Regional Manager</th>
                  <th className="pb-3 pr-4 text-right">Orders</th>
                  <th className="pb-3 pr-4 text-right">Active</th>
                  <th className="pb-3 pr-4 text-right">Customers</th>
                  <th className="pb-3 pr-4 text-right">Qty</th>
                  <th className="pb-3 text-right">Booked GMV</th>
                </tr>
              </thead>
              <tbody>
                {[...regionalScopedAreaManagers]
                  .sort((a, b) => b.bookedGMV - a.bookedGMV)
                  .map((manager, index) => (
                    <tr
                      key={manager.name}
                      onClick={() => {
                        setSelectedAreaManager(manager.name);
                        setSelectedSalesName(ALL);
                      }}
                      className={cn(
                        'cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30',
                        selectedAreaManager === manager.name ? 'bg-cyan-400/8' : '',
                      )}
                    >
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                            index < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
                          )}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium text-foreground">{manager.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{manager.parentManager ?? '-'}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(manager.orders)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(manager.activeOrders)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(manager.customers)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(manager.quantity)}</td>
                      <td className="py-3 text-right font-semibold text-foreground">{formatIDR(manager.bookedGMV)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Top Repeat GT Customers" subtitle="Highest purchase frequency in current filter">
          {gtRetentionCustomers.length ? (
            <div className="space-y-3">
              {gtRetentionCustomers.slice(0, 10).map((customer: CustomerRetentionCustomer, index) => (
                <button
                  key={`${customer.customer}-${customer.channelKey}`}
                  type="button"
                  className="flex w-full min-w-0 items-center gap-3 rounded-[8px] border border-border bg-muted/10 p-3 text-left transition hover:border-primary/35 hover:bg-muted/20"
                  onClick={() => setTableSearch(customer.customer)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-cyan-400/25 bg-cyan-400/8 text-xs font-semibold text-cyan-100">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{customer.customer}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customer.segment} - {formatNumber(customer.activeMonths)} active months
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">{formatNumber(customer.purchaseCount)}x</p>
                    <p className="text-xs text-muted-foreground">{abbreviateIDR(customer.totalGMV)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <NoDataBlock label="Repeat customers will appear after multiple GT purchases are detected." />
          )}
        </ChartCard>
      </section>

      <ChartCard
        title="GT Customer Transaction Drilldown"
        subtitle="Recent GT transactions scoped by selected AM, BD/sales, and search"
        action={
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              placeholder="Search customer, city, sales..."
              className="h-8 w-full rounded-[8px] border border-border bg-background/70 pl-8 pr-3 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[8px] border border-border bg-muted/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Scoped Orders</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(filteredTransactions.length)}</p>
          </div>
          <div className="rounded-[8px] border border-border bg-muted/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Scoped GMV</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {abbreviateIDR(filteredTransactions.reduce((sum, order) => sum + order.bookedGMV, 0))}
            </p>
          </div>
          <div className="rounded-[8px] border border-border bg-muted/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Scoped Customers</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatNumber(new Set(filteredTransactions.map((order) => order.customer).filter(Boolean)).size)}
            </p>
          </div>
          <div className="rounded-[8px] border border-border bg-muted/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Scoped Cities</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {formatNumber(new Set(filteredTransactions.map((order) => `${order.province}|${order.city}`).filter(Boolean)).size)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">BD/Sales</th>
                <th className="pb-3 pr-4">Area Manager</th>
                <th className="pb-3 pr-4">City</th>
                <th className="pb-3 pr-4 text-right">Booked GMV</th>
                <th className="pb-3 pr-4 text-right">Active GMV</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.slice(0, 20).map((order) => (
                <tr key={order.orderKey} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(order.orderCreatedAt)}
                    </span>
                  </td>
                  <td className="max-w-[220px] py-3 pr-4 font-medium text-foreground">
                    <span className="block truncate">{order.customer ?? 'Unknown customer'}</span>
                  </td>
                  <td className="max-w-[180px] py-3 pr-4 text-foreground">
                    <span className="block truncate">{order.salesName ?? 'Unassigned BD'}</span>
                  </td>
                  <td className="max-w-[180px] py-3 pr-4 text-muted-foreground">
                    <span className="block truncate">{order.areaManager ?? '-'}</span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {order.city ?? '-'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(order.bookedGMV)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(order.activeGMV)}</td>
                  <td className="py-3 text-right">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-1 text-[11px] font-medium',
                        isCancelled(order.status)
                          ? 'border-rose-400/30 bg-rose-400/8 text-rose-100'
                          : 'border-emerald-400/30 bg-emerald-400/8 text-emerald-100',
                      )}
                    >
                      {order.status || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
              {!filteredTransactions.length ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No matching GT transactions in this focus.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-cyan-400/25 bg-cyan-400/8 text-cyan-100">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Clean reporting rule</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Scrach Card, Poster POSM, and MLBB Display Rack are excluded before GT metrics are calculated.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-violet-400/25 bg-violet-400/8 text-violet-100">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Sales accountability</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                BD/sales ranking is tied to Area Manager scope and transaction drilldown.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-amber-400/25 bg-amber-400/8 text-amber-100">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Customer retention</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Repeat behavior is shown by month and by customer purchase frequency.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
