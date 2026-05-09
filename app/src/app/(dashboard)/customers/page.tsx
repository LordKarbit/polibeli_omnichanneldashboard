'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { customerData, customerRepeatStats } from '@/data/mock/extended';
import { repeatBuyers, newVsRepeatTrend } from '@/data/mock/phase-completion';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, abbreviateIDR } from '@/lib/format';
import { Users, UserPlus, Repeat, BarChart3 } from 'lucide-react';
import type { EChartsOption } from 'echarts';

// Top customer bar
function getTopCustomerBarOption(): EChartsOption {
  const sorted = [...customerData].sort((a, b) => b.totalGMV - a.totalGMV).slice(0, 8);
  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => c.name.length > 22 ? c.name.slice(0, 22) + '…' : c.name),
      inverse: true,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: sorted.map((c, i) => ({
        value: c.totalGMV,
        itemStyle: {
          color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: chartColors.primary[i % chartColors.primary.length] + '88' }, { offset: 1, color: chartColors.primary[i % chartColors.primary.length] }] },
          borderRadius: [0, 6, 6, 0],
        },
      })),
      barWidth: '55%',
    }],
  });
}

// RFM scatter (Recency vs Frequency, size = Monetary)
function getRFMScatterOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number, string] };
        return `<strong>${p.data[3]}</strong><br/>Orders: ${p.data[0]}<br/>GMV: ${formatIDR(p.data[1])}<br/>Days Active: ${p.data[2]}`;
      },
    },
    grid: { left: 12, right: 24, top: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value', name: 'Orders',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value', name: 'GMV',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [{
      type: 'scatter',
      symbolSize: (data: number[]) => Math.max(Math.sqrt(data[2]) * 5, 15),
      data: customerData.map(c => {
        const daysActive = Math.ceil((new Date(c.lastOrder).getTime() - new Date(c.firstOrder).getTime()) / 86400000);
        return [c.orders, c.totalGMV, daysActive, c.name];
      }),
      itemStyle: {
        color: ((params: { dataIndex: number }) => chartColors.primary[params.dataIndex % chartColors.primary.length]) as unknown as string,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.25)',
      },
    }],
  });
}

// New vs Repeat donut
function getRepeatDonutOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '42%'],
      itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: [
        { value: customerRepeatStats.newCustomers, name: 'New Customers', itemStyle: { color: chartColors.primary[1] } },
        { value: customerRepeatStats.repeatCustomers, name: 'Repeat Customers', itemStyle: { color: chartColors.primary[5] } },
      ],
    }],
  });
}

// New vs Repeat line chart (weekly trend)
function getNewVsRepeatLineOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: newVsRepeatTrend.map(d => d.week),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        name: 'New Customers',
        type: 'line',
        smooth: true,
        data: newVsRepeatTrend.map(d => d.newCustomers),
        lineStyle: { color: chartColors.primary[1], width: 2 },
        areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: chartColors.primary[1] + '30' }, { offset: 1, color: chartColors.primary[1] + '05' }] } },
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: chartColors.primary[1] },
      },
      {
        name: 'Repeat Customers',
        type: 'line',
        smooth: true,
        data: newVsRepeatTrend.map(d => d.repeatCustomers),
        lineStyle: { color: chartColors.primary[5], width: 2 },
        areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: chartColors.primary[5] + '30' }, { offset: 1, color: chartColors.primary[5] + '05' }] } },
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: chartColors.primary[5] },
      },
    ],
  });
}

// Customer concentration Pareto
function getParetoOption(): EChartsOption {
  const sorted = [...customerData].sort((a, b) => b.totalGMV - a.totalGMV);
  const totalGMV = sorted.reduce((s, c) => s + c.totalGMV, 0);
  let cumulative = 0;
  const cumulativeData = sorted.map(c => {
    cumulative += c.totalGMV;
    return Math.round((cumulative / totalGMV) * 100);
  });

  return mergeChartOptions({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(c => c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name),
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, rotate: 45 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: [
      {
        type: 'value', name: 'GMV',
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      {
        type: 'value', name: 'Cumulative %', max: 100,
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'GMV',
        type: 'bar',
        data: sorted.map((c, i) => ({ value: c.totalGMV, itemStyle: { color: chartColors.primary[i % chartColors.primary.length], borderRadius: [4, 4, 0, 0] } })),
        barWidth: '50%',
      },
      {
        name: 'Cumulative %',
        type: 'line',
        yAxisIndex: 1,
        data: cumulativeData,
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  });
}

export default function CustomersPage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Total Customers" value={customerRepeatStats.totalCustomers.toLocaleString('id-ID')} change={8.5} changeLabel="vs prev month" icon={<Users className="h-5 w-5" />} />
        <KPICard label="New Customers" value={customerRepeatStats.newCustomers.toLocaleString('id-ID')} change={12.1} changeLabel="vs prev month" icon={<UserPlus className="h-5 w-5" />} />
        <KPICard label="Repeat Rate" value={`${customerRepeatStats.repeatRate}%`} change={2.3} changeLabel="vs prev month" icon={<Repeat className="h-5 w-5" />} />
        <KPICard label="Avg Orders/Repeat" value={customerRepeatStats.avgOrdersPerRepeat.toString()} icon={<BarChart3 className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top Customers by GMV" subtitle="All channels combined">
          <EChart option={getTopCustomerBarOption()} style={{ height: 350 }} />
        </ChartCard>
        <ChartCard title="RFM Scatter" subtitle="Orders vs GMV (bubble = days active)">
          <EChart option={getRFMScatterOption()} style={{ height: 350 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="New vs Repeat" subtitle="Customer composition donut">
          <EChart option={getRepeatDonutOption()} style={{ height: 300 }} />
        </ChartCard>
        <ChartCard title="New vs Repeat Trend" subtitle="Weekly customer acquisition line chart">
          <EChart option={getNewVsRepeatLineOption()} style={{ height: 300 }} />
        </ChartCard>
      </div>

      <ChartCard title="Customer Concentration (Pareto)" subtitle="GMV share + cumulative %">
        <EChart option={getParetoOption()} style={{ height: 300 }} />
      </ChartCard>

      {/* Repeat Buyer Table */}
      <ChartCard title="Repeat Buyer Table" subtitle="Customers with multiple orders in April 2026">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4 text-right">Orders</th>
                <th className="pb-3 pr-4 text-right">Total GMV</th>
                <th className="pb-3 pr-4 text-right">Avg Days Between</th>
                <th className="pb-3 pr-4 text-right">First Order</th>
                <th className="pb-3 text-right">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {repeatBuyers.map((c, i) => (
                <tr key={c.name} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>{i + 1}</span></td>
                  <td className="py-3 pr-4 font-medium text-foreground">{c.name}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{c.channel}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{c.orders}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(c.gmv)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{c.avgDaysBetween} days</td>
                  <td className="py-3 pr-4 text-right text-xs text-muted-foreground">{c.firstOrder}</td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{c.lastOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Full Customer Table */}
      <ChartCard title="Customer / Buyer Table" subtitle="All tracked customers with order details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4 text-right">Orders</th>
                <th className="pb-3 pr-4 text-right">Total GMV</th>
                <th className="pb-3 pr-4 text-right">First Order</th>
                <th className="pb-3 text-right">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {[...customerData].sort((a, b) => b.totalGMV - a.totalGMV).map((c, i) => (
                <tr key={c.name} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>{i + 1}</span></td>
                  <td className="py-3 pr-4 font-medium text-foreground">{c.name}</td>
                  <td className="py-3 pr-4"><span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${c.type === 'Agency' ? 'bg-purple-500/10 text-purple-400' : c.type === 'Reseller' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-muted text-muted-foreground'}`}>{c.type}</span></td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{c.channel}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{c.orders}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(c.totalGMV)}</td>
                  <td className="py-3 pr-4 text-right text-xs text-muted-foreground">{c.firstOrder}</td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{c.lastOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
