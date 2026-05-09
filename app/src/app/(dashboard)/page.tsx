'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { executiveKPIs, channelContributions, dailyGMV } from '@/data/mock/executive';
import { cancellationAlerts } from '@/data/mock/phase-completion';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, abbreviateIDR } from '@/lib/format';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  BarChart3,
  XCircle,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';

const iconMap: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  DollarSign: <DollarSign className="h-5 w-5" />,
  ShoppingCart: <ShoppingCart className="h-5 w-5" />,
  BarChart3: <BarChart3 className="h-5 w-5" />,
  XCircle: <XCircle className="h-5 w-5" />,
  RotateCcw: <RotateCcw className="h-5 w-5" />,
};

// Donut chart for channel contribution
function getDonutOption(): EChartsOption {
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
      right: 10,
      top: 'center',
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    },
    series: [
      {
        name: 'Channel GMV',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: 'rgba(0,0,0,0.3)',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.3)' },
        },
        data: channelContributions.map((c) => ({
          value: c.bookedGMV,
          name: c.channel,
          itemStyle: { color: chartColors.channels[c.channelKey as keyof typeof chartColors.channels] },
        })),
      },
    ],
  });
}

// Multi-line daily GMV trend
function getDailyGMVOption(): EChartsOption {
  const channels = [
    { key: 'gt' as const, name: 'GT', color: chartColors.channels.gt },
    { key: 'mt' as const, name: 'MT', color: chartColors.channels.mt },
    { key: 'shopee' as const, name: 'Shopee', color: chartColors.channels.shopee },
    { key: 'tiktok1' as const, name: 'TT Kayou ID', color: chartColors.channels.tiktok1 },
    { key: 'tiktok2' as const, name: 'TT Kayou Card', color: chartColors.channels.tiktok2 },
  ];

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const pList = params as Array<{ seriesName: string; value: number; marker: string }>;
        let html = `<strong>${(params as Array<{ axisValue: string }>)[0]?.axisValue}</strong><br/>`;
        pList.forEach((p) => {
          html += `${p.marker} ${p.seriesName}: ${abbreviateIDR(p.value)}<br/>`;
        });
        return html;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: dailyGMV.map((d) => d.date.slice(5)),
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, rotate: 45 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        formatter: (v: number) => abbreviateIDR(v),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: channels.map((ch) => ({
      name: ch.name,
      type: 'line' as const,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: ch.color },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: ch.color + '30' },
            { offset: 1, color: ch.color + '05' },
          ],
        },
      },
      data: dailyGMV.map((d) => d[ch.key]),
    })),
  });
}

// Stacked bar GMV by channel
function getStackedBarOption(): EChartsOption {
  const channels = [
    { key: 'gt' as const, name: 'GT', color: chartColors.channels.gt },
    { key: 'mt' as const, name: 'MT', color: chartColors.channels.mt },
    { key: 'shopee' as const, name: 'Shopee', color: chartColors.channels.shopee },
    { key: 'tiktok1' as const, name: 'TT Kayou ID', color: chartColors.channels.tiktok1 },
    { key: 'tiktok2' as const, name: 'TT Kayou Card', color: chartColors.channels.tiktok2 },
  ];

  // Weekly aggregation
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const weeklyData = weeks.map((_, wi) => {
    const start = wi * 7;
    const end = Math.min(start + 7, dailyGMV.length);
    const slice = dailyGMV.slice(start, end);
    return {
      gt: slice.reduce((s, d) => s + d.gt, 0),
      mt: slice.reduce((s, d) => s + d.mt, 0),
      shopee: slice.reduce((s, d) => s + d.shopee, 0),
      tiktok1: slice.reduce((s, d) => s + d.tiktok1, 0),
      tiktok2: slice.reduce((s, d) => s + d.tiktok2, 0),
    };
  });

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const pList = params as Array<{ seriesName: string; value: number; marker: string; axisValue: string }>;
        let html = `<strong>${pList[0]?.axisValue}</strong><br/>`;
        pList.forEach((p) => {
          html += `${p.marker} ${p.seriesName}: ${abbreviateIDR(p.value)}<br/>`;
        });
        return html;
      },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks,
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        formatter: (v: number) => abbreviateIDR(v),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: channels.map((ch) => ({
      name: ch.name,
      type: 'bar' as const,
      stack: 'total',
      barWidth: '50%',
      itemStyle: { color: ch.color, borderRadius: [0, 0, 0, 0] },
      data: weeklyData.map((w) => w[ch.key]),
    })),
  });
}

// Combo chart: GMV bar + Order count line
function getComboGMVOrdersOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: channelContributions.map(c => c.channel),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'GMV',
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      {
        type: 'value',
        name: 'Orders',
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Booked GMV',
        type: 'bar',
        data: channelContributions.map((c, i) => ({
          value: c.bookedGMV,
          itemStyle: { color: chartColors.primary[i], borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: '35%',
      },
      {
        name: 'Orders',
        type: 'line',
        yAxisIndex: 1,
        data: channelContributions.map(c => c.orders),
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  });
}

// Top SKU horizontal bar
function getTopSKUOption(): EChartsOption {
  const topSkus = channelContributions.sort((a, b) => b.bookedGMV - a.bookedGMV);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number; marker: string }>)[0];
        return `${p.marker} <strong>${p.name}</strong><br/>${formatIDR(p.value)}`;
      },
    },
    grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        formatter: (v: number) => abbreviateIDR(v),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: topSkus.map((s) => s.channel),
      inverse: true,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: topSkus.map((s, i) => ({
          value: s.bookedGMV,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: chartColors.primary[i] + 'CC' },
                { offset: 1, color: chartColors.primary[i] },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: '60%',
      },
    ],
  });
}

export default function ExecutiveOverviewPage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {executiveKPIs.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.formattedValue}
            change={kpi.change}
            changeLabel={kpi.changeLabel}
            icon={iconMap[kpi.icon]}
          />
        ))}
      </div>

      {/* Cancellation Alert Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cancellationAlerts.map((alert) => (
          <div
            key={alert.channel}
            className={`rounded-xl border p-4 transition-all ${
              alert.cancelRate > 50
                ? 'border-red-500/30 bg-red-500/5'
                : alert.cancelRate > 25
                ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{alert.channel}</p>
                <p className={`mt-1 text-2xl font-bold ${
                  alert.cancelRate > 50 ? 'text-red-400' : alert.cancelRate > 25 ? 'text-amber-400' : 'text-foreground'
                }`}>
                  {alert.cancelRate}%
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {alert.cancelledOrders}/{alert.totalOrders} orders cancelled
                </p>
              </div>
              <AlertTriangle className={`h-5 w-5 ${
                alert.cancelRate > 50 ? 'text-red-400' : alert.cancelRate > 25 ? 'text-amber-400' : 'text-muted-foreground'
              }`} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Refund: <span className="font-semibold text-foreground">{abbreviateIDR(alert.refundAmount)}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Row 2: Donut + Daily Trend */}
      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          title="Channel Contribution"
          subtitle="Booked GMV by channel"
          className="lg:col-span-2"
        >
          <EChart option={getDonutOption()} style={{ height: 280 }} />
        </ChartCard>

        <ChartCard
          title="Daily GMV Trend"
          subtitle="April 2026 — all channels"
          className="lg:col-span-3"
        >
          <EChart option={getDailyGMVOption()} style={{ height: 280 }} />
        </ChartCard>
      </div>

      {/* Row 3: Stacked Bar + Combo GMV+Orders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Weekly GMV by Channel"
          subtitle="Stacked comparison"
        >
          <EChart option={getStackedBarOption()} style={{ height: 300 }} />
        </ChartCard>

        <ChartCard
          title="GMV + Orders by Channel"
          subtitle="Combo chart — bars = GMV, line = orders"
        >
          <EChart option={getComboGMVOrdersOption()} style={{ height: 300 }} />
        </ChartCard>
      </div>

      {/* Row 4: Top SKU bar */}
      <ChartCard
        title="GMV by Channel"
        subtitle="Booked GMV ranking"
      >
        <EChart option={getTopSKUOption()} style={{ height: 260 }} />
      </ChartCard>

      {/* Channel Detail Table */}
      <ChartCard title="Channel Summary" subtitle="Key metrics per channel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4 text-right">Orders</th>
                <th className="pb-3 pr-4 text-right">Booked GMV</th>
                <th className="pb-3 pr-4 text-right">Active GMV</th>
                <th className="pb-3 pr-4 text-right">AOV</th>
                <th className="pb-3 text-right">% Total</th>
              </tr>
            </thead>
            <tbody>
              {channelContributions.map((c) => (
                <tr key={c.channelKey} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: chartColors.channels[c.channelKey as keyof typeof chartColors.channels] }}
                      />
                      <span className="font-medium text-foreground">{c.channel}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right text-foreground">{c.orders.toLocaleString('id-ID')}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(c.bookedGMV)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(c.activeGMV)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(c.aov)}</td>
                  <td className="py-3 text-right">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {c.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
