'use client';

import { Clock, RotateCcw, Truck, XCircle } from 'lucide-react';
import type { EChartsOption } from 'echarts';

import { EChart } from '@/components/charts/echart';
import { ChartCard } from '@/components/ui/chart-card';
import { KPICard } from '@/components/ui/kpi-card';
import { mergeChartOptions } from '@/lib/chart-config';
import { useDashboardData, type DailyGMVPoint, type StatusSummary } from '@/lib/dashboard-client';
import { abbreviateIDR, formatIDR } from '@/lib/format';
import { chartColors } from '@/lib/theme';

function statusColor(status: string) {
  const value = status.toLowerCase();
  if (value.includes('cancel') || value.includes('refund') || value.includes('return')) return '#ef4444';
  if (value.includes('complete') || value.includes('received') || value.includes('selesai')) return '#10b981';
  if (value.includes('ship') || value.includes('kirim')) return '#3b82f6';
  return '#f59e0b';
}

function sourceShort(source: string) {
  return source.replace('TikTok Shop ', 'TT ');
}

function getStatusBarOption(rows: StatusSummary[]): EChartsOption {
  const sources = [...new Set(rows.map((row) => row.source))];
  const statuses = [...new Set(rows.map((row) => row.status))];

  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 10 } },
    grid: { left: 12, right: 12, top: 16, bottom: 50, containLabel: true },
    xAxis: {
      type: 'category',
      data: sources.map(sourceShort),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: statuses.map((status) => ({
      name: status,
      type: 'bar' as const,
      stack: 'total',
      barWidth: '45%',
      itemStyle: { color: statusColor(status) },
      data: sources.map((source) => rows.find((row) => row.source === source && row.status === status)?.orders ?? 0),
    })),
  });
}

function getTrendLineOption(daily: DailyGMVPoint[]): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 42, containLabel: true },
    xAxis: {
      type: 'category',
      data: daily.map((day) => day.date.slice(5)),
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, rotate: daily.length > 14 ? 45 : 0 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Orders',
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      {
        type: 'value',
        name: 'GMV',
        axisLabel: { color: 'rgba(255,255,255,0.42)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
        splitLine: { show: false },
      },
    ],
    series: [
      { name: 'Orders', type: 'bar', data: daily.map((day) => day.orders), itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] }, barWidth: '42%' },
      { name: 'Booked GMV', type: 'line', yAxisIndex: 1, smooth: true, data: daily.map((day) => day.bookedGMV), lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' }, showSymbol: false },
      { name: 'Active GMV', type: 'line', yAxisIndex: 1, smooth: true, data: daily.map((day) => day.activeGMV), lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' }, showSymbol: false },
    ],
  });
}

function getFunnelOption(totalOrders: number, activeOrders: number, cancelledOrders: number): EChartsOption {
  const pendingOrders = Math.max(0, totalOrders - activeOrders - cancelledOrders);

  return mergeChartOptions({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'funnel',
      left: '10%',
      top: 16,
      bottom: 16,
      width: '80%',
      min: 0,
      max: 100,
      sort: 'descending',
      gap: 4,
      label: { show: true, position: 'inside', color: '#fff', fontSize: 12, fontWeight: 'bold', formatter: '{b}\n{c}%' },
      itemStyle: { borderColor: 'rgba(0,0,0,0.3)', borderWidth: 1 },
      data: [
        { value: 100, name: `Total (${totalOrders})`, itemStyle: { color: chartColors.primary[1] } },
        { value: totalOrders ? Math.round((activeOrders / totalOrders) * 100) : 0, name: `Active (${activeOrders})`, itemStyle: { color: '#10b981' } },
        { value: totalOrders ? Math.round((pendingOrders / totalOrders) * 100) : 0, name: `Pending/Shipped (${pendingOrders})`, itemStyle: { color: '#3b82f6' } },
        { value: totalOrders ? Math.round((cancelledOrders / totalOrders) * 100) : 0, name: `Cancelled (${cancelledOrders})`, itemStyle: { color: '#ef4444' } },
      ],
    }],
  });
}

function getWaterfallOption(bookedGMV: number, activeGMV: number, refundAmount: number): EChartsOption {
  const inactiveGMV = Math.max(0, bookedGMV - activeGMV);

  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 12, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Booked GMV', 'Inactive GMV', 'Refund Amount', 'Active GMV'],
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => abbreviateIDR(value) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [{
      name: 'GMV',
      type: 'bar',
      barWidth: '40%',
      label: { show: true, position: 'top', color: 'rgba(255,255,255,0.7)', fontSize: 10, formatter: (p: { value?: unknown }) => abbreviateIDR(Number(p.value ?? 0)) },
      data: [
        { value: bookedGMV, itemStyle: { color: chartColors.primary[1], borderRadius: [4, 4, 0, 0] } },
        { value: inactiveGMV, itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] } },
        { value: refundAmount, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
        { value: activeGMV, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
      ],
    }],
  });
}

function getCancellationReasonOption(rows: StatusSummary[]): EChartsOption {
  const cancellations = rows.filter((row) => statusColor(row.status) === '#ef4444');

  return mergeChartOptions({
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} orders ({d}%)' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 10 } },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '40%'],
      itemStyle: { borderRadius: 4, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 1 },
      label: { show: false },
      data: cancellations.map((row, index) => ({
        value: row.orders,
        name: `${sourceShort(row.source)} ${row.status}`,
        itemStyle: { color: chartColors.primary[index % chartColors.primary.length] },
      })),
    }],
  });
}

function getAgingProxyOption(rows: StatusSummary[]): EChartsOption {
  const operationalRows = rows
    .filter((row) => !['completed', 'received', 'selesai', 'cancelled', 'canceled', 'batal'].includes(row.status.toLowerCase()))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);

  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 12, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: operationalRows.map((row) => `${sourceShort(row.source)} ${row.status}`),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, rotate: operationalRows.length > 4 ? 25 : 0 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [{
      type: 'bar',
      data: operationalRows.map((row, index) => ({
        value: row.orders,
        itemStyle: { color: chartColors.primary[index % chartColors.primary.length], borderRadius: [4, 4, 0, 0] },
      })),
      barWidth: '45%',
      label: { show: true, position: 'top', color: '#fff', fontSize: 10 },
    }],
  });
}

export default function OperationsPage() {
  const { data } = useDashboardData();
  const summary = data?.summary;
  const statuses = data?.statuses ?? [];
  const totalCancelled = summary?.cancelledOrders ?? 0;
  const totalPending = Math.max(0, (summary?.orders ?? 0) - (summary?.activeOrders ?? 0) - totalCancelled);
  const totalRefundGMV = summary?.refundAmount ?? 0;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Total Cancelled" value={totalCancelled.toLocaleString('id-ID')} icon={<XCircle className="h-5 w-5" />} />
        <KPICard label="Pending / Shipped" value={totalPending.toLocaleString('id-ID')} icon={<Clock className="h-5 w-5" />} />
        <KPICard label="Refund Amount" value={abbreviateIDR(totalRefundGMV)} icon={<RotateCcw className="h-5 w-5" />} />
        <KPICard label="Active Orders" value={(summary?.activeOrders ?? 0).toLocaleString('id-ID')} icon={<Truck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Order Status by Source" subtitle="Stacked status distribution per channel">
          <EChart option={getStatusBarOption(statuses)} style={{ height: 320 }} />
        </ChartCard>
        <ChartCard title="Daily Operational Trend" subtitle="Orders and GMV movement in the current filter">
          <EChart option={getTrendLineOption(data?.dailyGMV ?? [])} style={{ height: 320 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Order Lifecycle Funnel" subtitle="All channels combined">
          <EChart option={getFunnelOption(summary?.orders ?? 0, summary?.activeOrders ?? 0, summary?.cancelledOrders ?? 0)} style={{ height: 320 }} />
        </ChartCard>
        <ChartCard title="GMV Waterfall" subtitle="Booked to active GMV">
          <EChart option={getWaterfallOption(summary?.bookedGMV ?? 0, summary?.activeGMV ?? 0, summary?.refundAmount ?? 0)} style={{ height: 320 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cancellation Status Mix" subtitle="Cancelled, refunded, and returned order statuses">
          <EChart option={getCancellationReasonOption(statuses)} style={{ height: 320 }} />
        </ChartCard>
        <ChartCard title="Open Status Backlog" subtitle="Pending or in-transit order statuses">
          <EChart option={getAgingProxyOption(statuses)} style={{ height: 320 }} />
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
              {statuses.map((status) => (
                <tr key={`${status.source}-${status.status}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{status.source}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: statusColor(status.status), backgroundColor: `${statusColor(status.status)}1A` }}>
                      {status.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{status.orders.toLocaleString('id-ID')}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(status.gmv)}</td>
                  <td className="py-3 text-right"><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{status.percentWithinSource.toFixed(1)}%</span></td>
                </tr>
              ))}
              {!statuses.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No order status data available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
