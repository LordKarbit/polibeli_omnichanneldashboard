'use client';

import { useMemo, useState } from 'react';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { channelContributions as fallbackChannelContributions, dailyGMV as fallbackDailyGMV } from '@/data/mock/executive';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { abbreviateIDR, formatIDR, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useDashboardData, type ChannelSummary, type DailyGMVPoint } from '@/lib/dashboard-client';
import {
  AlertTriangle,
  CircleDollarSign,
  Gauge,
  Layers3,
  Loader2,
  MousePointer2,
  Radar,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';

type ChannelLike = Pick<ChannelSummary, 'channel' | 'channelKey' | 'orders' | 'bookedGMV' | 'activeGMV' | 'aov' | 'percentage'> &
  Partial<Pick<ChannelSummary, 'cancelledOrders' | 'cancellationRate' | 'refundAmount'>>;

type DailyLike = Pick<DailyGMVPoint, 'date' | 'gt' | 'mt' | 'shopee' | 'tiktok1' | 'tiktok2'> &
  Partial<Pick<DailyGMVPoint, 'bookedGMV' | 'activeGMV' | 'orders'> & { total: number }>;

type AlertLike = {
  channel: string;
  cancelRate: number;
  cancelledOrders: number;
  totalOrders: number;
  refundAmount: number;
};

const CHANNELS = [
  { key: 'gt' as const, name: 'GT', color: chartColors.channels.gt },
  { key: 'mt' as const, name: 'MT', color: chartColors.channels.mt },
  { key: 'marketplace' as const, name: 'Marketplace', color: '#f97316' },
];

const MARKETPLACE_KEYS = new Set(['shopee', 'tiktok1', 'tiktok2']);

function channelColor(key: string) {
  if (key === 'marketplace') return '#f97316';
  return chartColors.channels[key as keyof typeof chartColors.channels] ?? '#64748b';
}

function executiveChannelKey(key: string) {
  return MARKETPLACE_KEYS.has(key) ? 'marketplace' : key;
}

function dailyChannelValue(daily: DailyLike, key: string) {
  if (key === 'marketplace') return Number(daily.shopee ?? 0) + Number(daily.tiktok1 ?? 0) + Number(daily.tiktok2 ?? 0);
  return Number(daily[key as keyof Pick<DailyLike, 'gt' | 'mt'>] ?? 0);
}

function dailyBooked(daily: DailyLike) {
  return daily.bookedGMV ?? daily.total ?? CHANNELS.reduce((total, channel) => total + dailyChannelValue(daily, channel.key), 0);
}

function dailyActive(daily: DailyLike) {
  return daily.activeGMV ?? dailyBooked(daily);
}

function periodLabel(start?: string | null, end?: string | null) {
  if (!start || !end || start === 'Unknown' || end === 'Unknown') return 'Current filter period';
  if (start === end) return start;
  return `${start} to ${end}`;
}

function compactChannelName(name: string) {
  return name
    .replace('TikTok Shop (Kayou ID)', 'TikTok ID')
    .replace('TikTok Shop (Kayou Card ID)', 'TikTok Card')
    .replace('General Trade', 'GT')
    .replace('Modern Trade', 'MT')
    .replace('Shopee', 'Marketplace')
    .replace('TikTok ID', 'Marketplace')
    .replace('TikTok Card', 'Marketplace');
}

function groupExecutiveChannels(channels: ChannelLike[]): ChannelLike[] {
  const grouped = new Map<string, ChannelLike & { cancelledOrders: number; refundAmount: number }>();

  channels.forEach((channel) => {
    const key = executiveChannelKey(channel.channelKey);
    const current = grouped.get(key) ?? {
      channelKey: key,
      channel: CHANNELS.find((item) => item.key === key)?.name ?? channel.channel,
      orders: 0,
      activeGMV: 0,
      bookedGMV: 0,
      aov: 0,
      percentage: 0,
      cancelledOrders: 0,
      cancellationRate: 0,
      refundAmount: 0,
    };

    current.orders += channel.orders;
    current.bookedGMV += channel.bookedGMV;
    current.activeGMV += channel.activeGMV;
    current.cancelledOrders += channel.cancelledOrders ?? 0;
    current.refundAmount += channel.refundAmount ?? 0;
    grouped.set(key, current);
  });

  const total = Array.from(grouped.values()).reduce((sum, channel) => sum + channel.bookedGMV, 0);

  return CHANNELS.map((channel) => grouped.get(channel.key) ?? {
    channelKey: channel.key,
    channel: channel.name,
    orders: 0,
    activeGMV: 0,
    bookedGMV: 0,
    aov: 0,
    percentage: 0,
    cancelledOrders: 0,
    cancellationRate: 0,
    refundAmount: 0,
  })
    .map((channel) => ({
      ...channel,
      aov: channel.orders ? channel.bookedGMV / channel.orders : 0,
      percentage: total ? (channel.bookedGMV / total) * 100 : 0,
      cancellationRate: channel.orders ? ((channel.cancelledOrders ?? 0) / channel.orders) * 100 : 0,
    }))
    .sort((a, b) => b.bookedGMV - a.bookedGMV);
}

function getTrendOption(dailyGMV: DailyLike[]): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
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
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: 'rgba(255,255,255,0.68)', fontSize: 11 },
    },
    grid: { left: 12, right: 18, top: 42, bottom: 26, containLabel: true },
    xAxis: {
      type: 'category',
      data: dailyGMV.map((day) => day.date.slice(5)),
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, rotate: dailyGMV.length > 18 ? 35 : 0 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisTick: { show: false },
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
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: '#22d3ee' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34,211,238,0.28)' },
              { offset: 1, color: 'rgba(34,211,238,0.02)' },
            ],
          },
        },
        data: dailyGMV.map((day) => dailyBooked(day)),
      },
      {
        name: 'Active GMV',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#34d399' },
        data: dailyGMV.map((day) => dailyActive(day)),
      },
      {
        name: 'Orders',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: '38%',
        itemStyle: { color: 'rgba(168,85,247,0.32)', borderRadius: [4, 4, 0, 0] },
        data: dailyGMV.map((day) => Number(day.orders ?? 0)),
      },
    ],
  });
}

function getChannelShareOption(channels: ChannelLike[]): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>Booked GMV: ${formatIDR(p.value)}<br/>Share: ${p.percent}%`;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.68)', fontSize: 11 },
      itemGap: 10,
    },
    series: [
      {
        name: 'Channel Share',
        type: 'pie',
        radius: ['56%', '76%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: 'rgba(2,6,23,0.78)',
          borderWidth: 3,
        },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          itemStyle: { shadowBlur: 18, shadowColor: 'rgba(0,0,0,0.35)' },
        },
        data: channels.map((channel) => ({
          value: channel.bookedGMV,
          name: compactChannelName(channel.channel),
          itemStyle: { color: channelColor(channel.channelKey) },
        })),
      },
    ],
  });
}

function getWeeklyStackedOption(dailyGMV: DailyLike[]): EChartsOption {
  const weeks = Array.from({ length: Math.max(1, Math.ceil(dailyGMV.length / 7)) }, (_, index) => `Week ${index + 1}`);
  const weeklyData = weeks.map((_, weekIndex) => {
    const slice = dailyGMV.slice(weekIndex * 7, weekIndex * 7 + 7);
    return CHANNELS.reduce<Record<string, number>>((acc, channel) => {
      acc[channel.key] = slice.reduce((total, day) => total + dailyChannelValue(day, channel.key), 0);
      return acc;
    }, {});
  });

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const rows = params as Array<{ axisValue: string; marker: string; seriesName: string; value: number }>;
        const total = rows.reduce((sum, row) => sum + row.value, 0);
        return [
          `<strong>${rows[0]?.axisValue ?? ''}</strong>`,
          `Total: ${formatIDR(total)}`,
          ...rows.map((row) => `${row.marker} ${row.seriesName}: ${abbreviateIDR(row.value)}`),
        ].join('<br/>');
      },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.66)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 18, bottom: 44, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks,
      axisLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: CHANNELS.map((channel) => ({
      name: channel.name,
      type: 'bar',
      stack: 'total',
      barWidth: '52%',
      itemStyle: { color: channel.color },
      data: weeklyData.map((week) => week[channel.key]),
    })),
  });
}

function getChannelEfficiencyOption(channels: ChannelLike[]): EChartsOption {
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
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.66)', fontSize: 11 } },
    grid: { left: 12, right: 18, top: 18, bottom: 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: channels.map((channel) => compactChannelName(channel.channel)),
      axisLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 10, interval: 0, width: 86, overflow: 'break' },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'AOV',
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      {
        type: 'value',
        name: 'Orders',
        axisLabel: { color: 'rgba(255,255,255,0.42)', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'AOV',
        type: 'bar',
        barWidth: '42%',
        data: channels.map((channel) => ({
          value: channel.aov,
          itemStyle: { color: channelColor(channel.channelKey), borderRadius: [4, 4, 0, 0] },
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
        data: channels.map((channel) => channel.orders),
      },
    ],
  });
}

function getCancellationOption(alerts: AlertLike[]): EChartsOption {
  const ordered = [...alerts].sort((a, b) => b.cancelRate - a.cancelRate);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const row = (params as Array<{ dataIndex: number }>)[0];
        const alert = ordered[row?.dataIndex ?? 0];
        if (!alert) return '';
        return [
          `<strong>${compactChannelName(alert.channel)}</strong>`,
          `Cancel rate: ${formatPercent(alert.cancelRate)}`,
          `Cancelled orders: ${formatNumber(alert.cancelledOrders)} / ${formatNumber(alert.totalOrders)}`,
          `Refund: ${formatIDR(alert.refundAmount)}`,
        ].join('<br/>');
      },
    },
    grid: { left: 8, right: 18, top: 8, bottom: 10, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => `${value}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: ordered.map((alert) => compactChannelName(alert.channel)),
      axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 10, width: 92, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        barWidth: '58%',
        data: ordered.map((alert) => ({
          value: alert.cancelRate,
          itemStyle: {
            color: alert.cancelRate >= 50 ? '#ef4444' : alert.cancelRate >= 25 ? '#f59e0b' : '#22c55e',
            borderRadius: [0, 5, 5, 0],
          },
        })),
      },
    ],
  });
}

function ExecutiveMetricCard({
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

export default function ExecutiveOverviewPage() {
  const { data, isLoading } = useDashboardData();
  const [selectedChannelKey, setSelectedChannelKey] = useState<string | null>(null);

  const channelContributions = useMemo(
    () => groupExecutiveChannels((data?.channels?.length ? data.channels : fallbackChannelContributions) as ChannelLike[]),
    [data],
  );
  const dailyGMV = (data?.dailyGMV?.length ? data.dailyGMV : fallbackDailyGMV) as DailyLike[];
  const totalBooked = data?.summary.bookedGMV ?? channelContributions.reduce((total, channel) => total + channel.bookedGMV, 0);
  const totalActive = data?.summary.activeGMV ?? channelContributions.reduce((total, channel) => total + channel.activeGMV, 0);
  const totalOrders = data?.summary.orders ?? channelContributions.reduce((total, channel) => total + channel.orders, 0);
  const totalRefund = data?.summary.refundAmount ?? channelContributions.reduce((total, channel) => total + (channel.refundAmount ?? 0), 0);
  const cancellationRate = data?.summary.cancellationRate ?? 0;
  const customers = data?.summary.customers ?? 0;
  const aov = data?.summary.aov ?? (totalOrders ? totalBooked / totalOrders : 0);
  const activeRatio = totalBooked ? (totalActive / totalBooked) * 100 : 0;
  const period = periodLabel(data?.summary.dateRange.start, data?.summary.dateRange.end);
  const topChannel = channelContributions[0];
  const selectedChannel = channelContributions.find((channel) => channel.channelKey === selectedChannelKey) ?? topChannel;
  const alerts: AlertLike[] = data
    ? channelContributions
        .filter((channel) => (channel.cancelledOrders ?? 0) > 0 || (channel.cancellationRate ?? 0) > 0)
        .map((channel) => ({
          channel: channel.channel,
          cancelRate: Number((channel.cancellationRate ?? 0).toFixed(1)),
          cancelledOrders: channel.cancelledOrders ?? 0,
          totalOrders: channel.orders,
          refundAmount: channel.refundAmount ?? 0,
        }))
    : groupExecutiveChannels(fallbackChannelContributions as ChannelLike[])
        .filter((channel) => (channel.cancelledOrders ?? 0) > 0 || (channel.cancellationRate ?? 0) > 0)
        .map((channel) => ({
          channel: channel.channel,
          cancelRate: Number((channel.cancellationRate ?? 0).toFixed(1)),
          cancelledOrders: channel.cancelledOrders ?? 0,
          totalOrders: channel.orders,
          refundAmount: channel.refundAmount ?? 0,
        }));
  const highRiskAlerts = alerts.filter((alert) => alert.cancelRate >= 25);
  const recentOrders = data?.orders ?? [];
  const selectedOrders = selectedChannel
    ? recentOrders.filter((order) => {
        if (selectedChannel.channelKey === 'gt') return order.channelGroup === 'GT';
        if (selectedChannel.channelKey === 'mt') return order.channelGroup === 'MT';
        if (selectedChannel.channelKey === 'marketplace') return order.channelGroup !== 'GT' && order.channelGroup !== 'MT';
        return false;
      })
    : [];
  const shownOrders = (selectedOrders.length ? selectedOrders : recentOrders).slice(0, 12);

  function handleChannelClick(params: unknown) {
    const click = params as { name?: string; data?: { name?: string } };
    const name = click.name ?? click.data?.name ?? '';
    const channel = channelContributions.find(
      (item) => item.channel === name || compactChannelName(item.channel) === name || item.channelKey === name,
    );
    if (channel) setSelectedChannelKey(channel.channelKey);
  }

  return (
    <div className="relative animate-fade-in-up space-y-4 sm:space-y-5 lg:space-y-6">
      {isLoading ? (
        <div className="sticky top-20 z-30 flex items-center gap-2 rounded-[8px] border border-primary/25 bg-card/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading executive overview...
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="relative overflow-hidden rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10 sm:p-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-400 to-orange-300" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-400/25 bg-cyan-400/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                  <Radar className="h-3.5 w-3.5" />
                  Executive Command View
                </span>
                <span className="rounded-[8px] border border-border bg-muted/25 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {period}
                </span>
              </div>
              <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                {abbreviateIDR(totalBooked)} booked GMV with {formatPercent(activeRatio)} active conversion.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Top channel is <span className="font-semibold text-foreground">{topChannel?.channel ?? 'N/A'}</span> at{' '}
                <span className="font-semibold text-foreground">{topChannel ? abbreviateIDR(topChannel.bookedGMV) : 'N/A'}</span>.
                {' '}Operational watchlist currently flags {highRiskAlerts.length.toLocaleString('id-ID')} channel risk signals.
              </p>
            </div>

            <div className="grid min-w-[260px] grid-cols-3 gap-2">
              <div className="rounded-[8px] border border-border bg-muted/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Orders</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(totalOrders)}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-muted/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">AOV</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{abbreviateIDR(aov)}</p>
              </div>
              <div className="rounded-[8px] border border-border bg-muted/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Cancel</p>
                <p className={cn('mt-1 text-lg font-semibold', cancellationRate >= 25 ? 'text-amber-300' : 'text-foreground')}>
                  {formatPercent(cancellationRate)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {channelContributions.map((channel) => {
              const isSelected = selectedChannel?.channelKey === channel.channelKey;
              return (
                <button
                  key={channel.channelKey}
                  type="button"
                  onClick={() => setSelectedChannelKey(channel.channelKey)}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-medium transition',
                    isSelected
                      ? 'border-cyan-300/70 bg-cyan-500/12 text-cyan-100'
                      : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: channelColor(channel.channelKey) }} />
                  {compactChannelName(channel.channel)}
                  <span className="text-[11px] tabular-nums text-muted-foreground">{formatPercent(channel.percentage)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <ExecutiveMetricCard
            label="Data Confidence"
            value={data?.hasData ? `${formatPercent(data.dataQuality.validPercent)}` : 'Sample'}
            meta={data ? `${formatNumber(data.dataQuality.validRows)} valid rows, ${formatNumber(data.dataQuality.warningIssues)} warnings` : 'Using fallback executive sample'}
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="emerald"
          />
          <ExecutiveMetricCard
            label="Risk Monitor"
            value={`${formatNumber(highRiskAlerts.length)} Signals`}
            meta={`${formatIDR(totalRefund)} refund exposure`}
            icon={<AlertTriangle className="h-5 w-5" />}
            tone={highRiskAlerts.length ? 'amber' : 'cyan'}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ExecutiveMetricCard label="Booked GMV" value={abbreviateIDR(totalBooked)} meta="Gross demand captured" icon={<CircleDollarSign className="h-5 w-5" />} tone="cyan" />
        <ExecutiveMetricCard label="Active GMV" value={abbreviateIDR(totalActive)} meta="After cancellations" icon={<TrendingUp className="h-5 w-5" />} tone="emerald" />
        <ExecutiveMetricCard label="Orders" value={formatNumber(totalOrders)} meta="Deduplicated orders" icon={<ShoppingCart className="h-5 w-5" />} tone="violet" />
        <ExecutiveMetricCard label="Customers" value={formatNumber(customers)} meta="Known identities" icon={<Users className="h-5 w-5" />} tone="cyan" />
        <ExecutiveMetricCard label="Refund" value={abbreviateIDR(totalRefund)} meta="Refund exposure" icon={<RotateCcw className="h-5 w-5" />} tone="amber" />
        <ExecutiveMetricCard label="Cancel Rate" value={formatPercent(cancellationRate)} meta="Cancelled / total orders" icon={<XCircle className="h-5 w-5" />} tone={cancellationRate >= 25 ? 'rose' : 'emerald'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <ChartCard title="GMV Command Trend" subtitle="Booked vs active GMV, with daily order volume">
          <EChart option={getTrendOption(dailyGMV)} style={{ height: 390, minHeight: 340 }} />
        </ChartCard>

        <ChartCard title="Channel Mix" subtitle="Booked GMV share by selected period">
          <div className="grid gap-4">
            <EChart option={getChannelShareOption(channelContributions)} style={{ height: 260, minHeight: 240 }} onClick={handleChannelClick} />
            <div className="grid gap-2">
              {channelContributions.slice(0, 5).map((channel) => {
                const width = Math.max(4, channel.percentage);
                return (
                  <button
                    key={channel.channelKey}
                    type="button"
                    onClick={() => setSelectedChannelKey(channel.channelKey)}
                    className={cn(
                      'grid gap-1 rounded-[8px] border px-3 py-2 text-left transition',
                      selectedChannel?.channelKey === channel.channelKey
                        ? 'border-cyan-300/60 bg-cyan-500/10'
                        : 'border-border bg-muted/10 hover:bg-muted/20',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-semibold text-foreground">{compactChannelName(channel.channel)}</span>
                      <span className="text-xs font-semibold text-foreground">{abbreviateIDR(channel.bookedGMV)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: channelColor(channel.channelKey) }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Weekly GMV Stack" subtitle="Channel contribution by week">
          <EChart option={getWeeklyStackedOption(dailyGMV)} style={{ height: 330, minHeight: 300 }} />
        </ChartCard>

        <ChartCard title="Channel Efficiency" subtitle="AOV bars with order volume line">
          <EChart option={getChannelEfficiencyOption(channelContributions)} style={{ height: 330, minHeight: 300 }} onClick={handleChannelClick} />
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
        <ChartCard title="Cancellation Watchlist" subtitle="Refund and cancellation pressure by channel">
          <div className="grid gap-4">
            <EChart option={getCancellationOption(alerts)} style={{ height: 250, minHeight: 230 }} />
            <div className="grid gap-2">
              {alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.channel}
                  className={cn(
                    'rounded-[8px] border px-3 py-2',
                    alert.cancelRate >= 50
                      ? 'border-red-500/30 bg-red-500/8'
                      : alert.cancelRate >= 25
                        ? 'border-amber-500/30 bg-amber-500/8'
                        : 'border-border bg-muted/10',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-semibold text-foreground">{compactChannelName(alert.channel)}</span>
                    <span className={cn('text-xs font-semibold', alert.cancelRate >= 50 ? 'text-red-300' : alert.cancelRate >= 25 ? 'text-amber-300' : 'text-emerald-300')}>
                      {formatPercent(alert.cancelRate)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatNumber(alert.cancelledOrders)} cancelled of {formatNumber(alert.totalOrders)} orders, {abbreviateIDR(alert.refundAmount)} refund
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Channel Performance Matrix"
          subtitle={selectedChannel ? `Focused on ${selectedChannel.channel}` : 'Click a channel to focus'}
          action={
            selectedChannel ? (
              <button
                type="button"
                onClick={() => setSelectedChannelKey(null)}
                className="rounded-[8px] border border-border bg-muted/20 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                Clear Focus
              </button>
            ) : null
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Channel</th>
                  <th className="pb-3 pr-4 text-right">Orders</th>
                  <th className="pb-3 pr-4 text-right">Booked GMV</th>
                  <th className="pb-3 pr-4 text-right">Active GMV</th>
                  <th className="pb-3 pr-4 text-right">AOV</th>
                  <th className="pb-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {channelContributions.map((channel) => {
                  const isSelected = selectedChannel?.channelKey === channel.channelKey;
                  return (
                    <tr
                      key={channel.channelKey}
                      onClick={() => setSelectedChannelKey(channel.channelKey)}
                      className={cn(
                        'cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30',
                        isSelected && 'bg-primary/8',
                      )}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: channelColor(channel.channelKey) }} />
                          <span className="font-medium text-foreground">{compactChannelName(channel.channel)}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatNumber(channel.orders)}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(channel.bookedGMV)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatIDR(channel.activeGMV)}</td>
                      <td className="py-3 pr-4 text-right text-foreground">{formatIDR(channel.aov)}</td>
                      <td className="py-3 text-right">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {formatPercent(channel.percentage)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div className="grid gap-4">
          <div className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              Management Signals
            </div>
            <div className="mt-4 grid gap-3">
              {[
                {
                  icon: Target,
                  title: 'Growth Concentration',
                  body: `${topChannel ? compactChannelName(topChannel.channel) : 'N/A'} carries ${topChannel ? formatPercent(topChannel.percentage) : '0%'} of booked GMV.`,
                },
                {
                  icon: Gauge,
                  title: 'Conversion Quality',
                  body: `${formatPercent(activeRatio)} of booked GMV remains active after cancellation effects.`,
                },
                {
                  icon: Zap,
                  title: 'Execution Priority',
                  body: highRiskAlerts.length
                    ? `${highRiskAlerts.length} channel(s) need cancellation or refund review.`
                    : 'No high-risk channel cancellation signals in the current filter.',
                },
              ].map((signal) => {
                const Icon = signal.icon;
                return (
                  <div key={signal.title} className="flex gap-3 rounded-[8px] border border-border bg-muted/10 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{signal.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
              <Layers3 className="h-3.5 w-3.5" />
              Focus Channel
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">{selectedChannel ? compactChannelName(selectedChannel.channel) : 'No channel selected'}</p>
            {selectedChannel ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-[8px] border border-border bg-muted/10 p-3">
                  <p className="text-muted-foreground">Booked GMV</p>
                  <p className="mt-1 font-semibold text-foreground">{abbreviateIDR(selectedChannel.bookedGMV)}</p>
                </div>
                <div className="rounded-[8px] border border-border bg-muted/10 p-3">
                  <p className="text-muted-foreground">Orders</p>
                  <p className="mt-1 font-semibold text-foreground">{formatNumber(selectedChannel.orders)}</p>
                </div>
                <div className="rounded-[8px] border border-border bg-muted/10 p-3">
                  <p className="text-muted-foreground">AOV</p>
                  <p className="mt-1 font-semibold text-foreground">{abbreviateIDR(selectedChannel.aov)}</p>
                </div>
                <div className="rounded-[8px] border border-border bg-muted/10 p-3">
                  <p className="text-muted-foreground">Share</p>
                  <p className="mt-1 font-semibold text-foreground">{formatPercent(selectedChannel.percentage)}</p>
                </div>
              </div>
            ) : null}
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MousePointer2 className="h-3.5 w-3.5" />
              Click charts or channel rows to update this focus.
            </p>
          </div>
        </div>

        <ChartCard
          title="Recent Order Drilldown"
          subtitle={selectedChannel ? `${compactChannelName(selectedChannel.channel)} recent deduped orders` : 'Latest deduped orders'}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">City</th>
                  <th className="pb-3 pr-4 text-right">Booked GMV</th>
                  <th className="pb-3 text-right">Active GMV</th>
                </tr>
              </thead>
              <tbody>
                {shownOrders.map((order) => (
                  <tr key={order.orderKey} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="py-3 pr-4 font-mono text-xs text-foreground">{order.sourceOrderId}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{order.source}</td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        'rounded-md px-2 py-0.5 text-xs font-medium capitalize',
                        order.status === 'cancelled' || order.status === 'returned' || order.status === 'refunded'
                          ? 'bg-red-500/10 text-red-300'
                          : 'bg-emerald-500/10 text-emerald-300',
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-foreground">{order.city ?? '-'}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(order.bookedGMV)}</td>
                    <td className="py-3 text-right text-foreground">{formatIDR(order.activeGMV)}</td>
                  </tr>
                ))}
                {shownOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                      No recent orders available in the current filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </section>
    </div>
  );
}
