'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { orderStatusDetails, cancellationTrend } from '@/data/mock/extended';
import { cancelReasons, orderAging } from '@/data/mock/phase-completion';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, abbreviateIDR } from '@/lib/format';
import { XCircle, Clock, RotateCcw, Truck } from 'lucide-react';
import type { EChartsOption } from 'echarts';

const totalCancelled = orderStatusDetails.filter(s => ['Cancelled', 'Canceled', 'Batal'].includes(s.status)).reduce((s, o) => s + o.orders, 0);
const totalPending = orderStatusDetails.filter(s => s.status.includes('Pending') || s.status.includes('Sedang') || s.status.includes('Shipped') || s.status.includes('Telah')).reduce((s, o) => s + o.orders, 0);
const totalRefundGMV = orderStatusDetails.filter(s => ['Cancelled', 'Canceled', 'Batal'].includes(s.status)).reduce((s, o) => s + o.gmv, 0);

// Stacked status bar by source
function getStatusBarOption(): EChartsOption {
  const sources = [...new Set(orderStatusDetails.map(s => s.source))];
  const statuses = [...new Set(orderStatusDetails.map(s => s.status))];
  const statusColors: Record<string, string> = {
    'Received': '#10b981', 'Completed': '#10b981', 'Selesai': '#10b981',
    'Shipped': '#3b82f6', 'Sedang Dikirim': '#3b82f6', 'Telah Dikirim': '#06b6d4',
    'Cancelled': '#ef4444', 'Canceled': '#ef4444', 'Batal': '#ef4444',
    'Pending Receipt': '#f59e0b', 'Pending Shipment': '#f97316',
  };

  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 10 } },
    grid: { left: 12, right: 12, top: 16, bottom: 50, containLabel: true },
    xAxis: {
      type: 'category',
      data: sources.map(s => s.replace('TikTok Shop ', 'TT ')),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: statuses.map(status => ({
      name: status,
      type: 'bar' as const,
      stack: 'total',
      barWidth: '45%',
      itemStyle: { color: statusColors[status] || chartColors.primary[0], borderRadius: [0, 0, 0, 0] },
      data: sources.map(src => {
        const found = orderStatusDetails.find(o => o.source === src && o.status === status);
        return found?.orders ?? 0;
      }),
    })),
  });
}

// Pending/Cancelled trend line
function getTrendLineOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: cancellationTrend.map(d => d.date.slice(5)),
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, rotate: 45 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      { name: 'Completed', type: 'line', smooth: true, data: cancellationTrend.map(d => d.completed), lineStyle: { color: '#10b981', width: 2 }, areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#10b98130' }, { offset: 1, color: '#10b98105' }] } }, showSymbol: false },
      { name: 'Cancelled', type: 'line', smooth: true, data: cancellationTrend.map(d => d.cancelled), lineStyle: { color: '#ef4444', width: 2 }, areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#ef444430' }, { offset: 1, color: '#ef444405' }] } }, showSymbol: false },
      { name: 'Pending', type: 'line', smooth: true, data: cancellationTrend.map(d => d.pending), lineStyle: { color: '#f59e0b', width: 2 }, showSymbol: false },
    ],
  });
}

// Order lifecycle funnel (all channels)
function getFunnelOption(): EChartsOption {
  const totalOrders = 2748;
  const shipped = 584 + 18 + 19 + 11;
  const completed = 71 + 458 + 33 + 852;
  const cancelled = totalCancelled;

  return mergeChartOptions({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'funnel',
      left: '10%', top: 16, bottom: 16, width: '80%',
      min: 0, max: 100, sort: 'descending', gap: 4,
      label: { show: true, position: 'inside', color: '#fff', fontSize: 12, fontWeight: 'bold', formatter: '{b}\n{c}%' },
      itemStyle: { borderColor: 'rgba(0,0,0,0.3)', borderWidth: 1 },
      data: [
        { value: 100, name: `Total (${totalOrders})`, itemStyle: { color: chartColors.primary[1] } },
        { value: Math.round((completed / totalOrders) * 100), name: `Completed (${completed})`, itemStyle: { color: '#10b981' } },
        { value: Math.round((shipped / totalOrders) * 100), name: `In Transit (${shipped})`, itemStyle: { color: '#3b82f6' } },
        { value: Math.round((cancelled / totalOrders) * 100), name: `Cancelled (${cancelled})`, itemStyle: { color: '#ef4444' } },
      ],
    }],
  });
}

// Waterfall: Booked → Active GMV breakdown
function getWaterfallOption(): EChartsOption {
  const bookedGMV = 854_698_594;
  const cancelledGMV = totalRefundGMV;
  const activeGMV = 671_192_934;
  const refundAmount = 124_054_415;

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const pList = params as Array<{ seriesName: string; value: number; marker: string; name: string }>;
        const visible = pList.find(p => p.seriesName !== 'placeholder');
        if (!visible) return '';
        return `<strong>${visible.name}</strong><br/>${visible.marker} ${formatIDR(visible.value)}`;
      },
    },
    grid: { left: 12, right: 12, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Booked GMV', 'Cancelled GMV', 'Refund Amount', 'Active GMV'],
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        name: 'placeholder',
        type: 'bar',
        stack: 'waterfall',
        itemStyle: { borderColor: 'transparent', color: 'transparent' },
        emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
        data: [0, activeGMV, activeGMV - refundAmount, 0],
      },
      {
        name: 'GMV',
        type: 'bar',
        stack: 'waterfall',
        barWidth: '40%',
        label: { show: true, position: 'top', color: 'rgba(255,255,255,0.7)', fontSize: 10, formatter: (p: { value?: unknown }) => abbreviateIDR(Number(p.value ?? 0)) },
        data: [
          { value: bookedGMV, itemStyle: { color: chartColors.primary[1], borderRadius: [4, 4, 0, 0] } },
          { value: cancelledGMV, itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] } },
          { value: refundAmount, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
          { value: activeGMV, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
        ],
      },
    ],
  });
}

// Cancel reason donut chart
function getCancelReasonDonutOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} orders ({d}%)' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 10 } },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '40%'],
      itemStyle: { borderRadius: 4, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 1 },
      label: { show: false },
      data: cancelReasons.map((r, i) => ({
        value: r.count,
        name: r.reason,
        itemStyle: { color: chartColors.primary[i % chartColors.primary.length] }
      })),
    }],
  });
}

// Order aging bar chart
function getAgingBarOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 12, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: orderAging.map(a => a.bracket),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [{
      type: 'bar',
      data: orderAging.map((a, i) => ({
        value: a.count,
        itemStyle: { color: chartColors.primary[i % chartColors.primary.length], borderRadius: [4, 4, 0, 0] }
      })),
      barWidth: '45%',
      label: { show: true, position: 'top', color: '#fff', fontSize: 10 }
    }],
  });
}

export default function OperationsPage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Total Cancelled" value={totalCancelled.toString()} change={12.3} changeLabel="vs prev month" icon={<XCircle className="h-5 w-5" />} />
        <KPICard label="Pending Orders" value={totalPending.toString()} change={-8.1} changeLabel="vs prev month" icon={<Clock className="h-5 w-5" />} />
        <KPICard label="Cancelled GMV" value={abbreviateIDR(totalRefundGMV)} change={5.2} changeLabel="vs prev month" icon={<RotateCcw className="h-5 w-5" />} />
        <KPICard label="Avg Fulfillment" value="2.3 days" change={-15.0} changeLabel="improvement" icon={<Truck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Order Status by Source" subtitle="Stacked status distribution per channel">
          <EChart option={getStatusBarOption()} style={{ height: 320 }} />
        </ChartCard>
        <ChartCard title="Daily Order Status Trend" subtitle="Completed vs Cancelled vs Pending">
          <EChart option={getTrendLineOption()} style={{ height: 320 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Order Lifecycle Funnel" subtitle="All channels combined">
          <EChart option={getFunnelOption()} style={{ height: 320 }} />
        </ChartCard>
        <ChartCard title="GMV Waterfall" subtitle="Booked → Cancelled → Refund → Active">
          <EChart option={getWaterfallOption()} style={{ height: 320 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cancellation Reasons" subtitle="Breakdown of customer & system cancellations">
          <EChart option={getCancelReasonDonutOption()} style={{ height: 320 }} />
        </ChartCard>
        <ChartCard title="Pending Order Aging" subtitle="Unfulfilled order backlog duration">
          <EChart option={getAgingBarOption()} style={{ height: 320 }} />
        </ChartCard>
      </div>

      <ChartCard title="Order Status Detail" subtitle="Full breakdown by source and status">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4 text-right">Orders</th>
                <th className="pb-3 pr-4 text-right">GMV Impact</th>
                <th className="pb-3 text-right">% of Source</th>
              </tr>
            </thead>
            <tbody>
              {orderStatusDetails.map((s) => (
                <tr key={`${s.source}-${s.status}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{s.source}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                      ['Cancelled', 'Canceled', 'Batal'].includes(s.status) ? 'bg-destructive/10 text-destructive'
                      : ['Completed', 'Received', 'Selesai'].includes(s.status) ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{s.orders}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(s.gmv)}</td>
                  <td className="py-3 text-right"><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{s.percentage}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
