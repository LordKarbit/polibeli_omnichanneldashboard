'use client';

import { BarChart3, Repeat, UserPlus, Users } from 'lucide-react';
import type { EChartsOption } from 'echarts';

import { EChart } from '@/components/charts/echart';
import { ChartCard } from '@/components/ui/chart-card';
import { KPICard } from '@/components/ui/kpi-card';
import { mergeChartOptions } from '@/lib/chart-config';
import { useDashboardData, type CustomerRetentionAnalytics, type CustomerRetentionCustomer } from '@/lib/dashboard-client';
import { abbreviateIDR, formatIDR, formatPercent } from '@/lib/format';
import { chartColors } from '@/lib/theme';

function compact(value: string, max = 22) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function getTopCustomerBarOption(customers: CustomerRetentionCustomer[]): EChartsOption {
  const sorted = [...customers].sort((a, b) => b.totalGMV - a.totalGMV).slice(0, 10);

  return mergeChartOptions({
    title: sorted.length
      ? undefined
      : {
          text: 'No customer data in current filter',
          left: 'center',
          top: 'middle',
          textStyle: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 },
        },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((customer) => compact(customer.customer)),
      inverse: true,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: sorted.map((customer, index) => ({
        value: customer.totalGMV,
        itemStyle: {
          color: chartColors.primary[index % chartColors.primary.length],
          borderRadius: [0, 6, 6, 0],
        },
      })),
      barWidth: '55%',
    }],
  });
}

function getRFMScatterOption(customers: CustomerRetentionCustomer[]): EChartsOption {
  return mergeChartOptions({
    title: customers.length
      ? undefined
      : {
          text: 'No RFM data in current filter',
          left: 'center',
          top: 'middle',
          textStyle: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 },
        },
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number, string] };
        return `<strong>${p.data[3]}</strong><br/>Purchases: ${p.data[0]}<br/>GMV: ${formatIDR(p.data[1])}<br/>Active months: ${p.data[2]}`;
      },
    },
    grid: { left: 12, right: 24, top: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Purchase Count',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      name: 'GMV',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [{
      type: 'scatter',
      symbolSize: (point: number[]) => Math.max(Math.sqrt(point[2] || 1) * 12, 14),
      data: customers.map((customer) => [customer.purchaseCount, customer.totalGMV, customer.activeMonths || 1, customer.customer]),
      itemStyle: {
        color: ((params: { dataIndex: number }) => chartColors.primary[params.dataIndex % chartColors.primary.length]) as unknown as string,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.25)',
      },
    }],
  });
}

function getRepeatDonutOption(retention: CustomerRetentionAnalytics): EChartsOption {
  const summary = retention.summary;

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
        { value: summary.oneTimeCustomers, name: 'One-time Customers', itemStyle: { color: chartColors.primary[1] } },
        { value: summary.repeatCustomers, name: 'Repeat Customers', itemStyle: { color: chartColors.primary[5] } },
      ],
    }],
  });
}

function getMonthlyRetentionOption(retention: CustomerRetentionAnalytics): EChartsOption {
  const ordered = [...retention.monthly].sort((a, b) => a.month.localeCompare(b.month));
  return mergeChartOptions({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 42, containLabel: true },
    xAxis: {
      type: 'category',
      data: ordered.map((row) => `${row.monthLabel} ${row.channel}`),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, rotate: ordered.length > 5 ? 25 : 0 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        name: 'One-time',
        type: 'bar',
        stack: 'customers',
        data: ordered.map((row) => row.oneTimeCustomers),
        itemStyle: { color: 'rgba(148,163,184,0.55)' },
      },
      {
        name: 'Repeat',
        type: 'bar',
        stack: 'customers',
        data: ordered.map((row) => row.repeatCustomers),
        itemStyle: { color: chartColors.primary[5], borderRadius: [5, 5, 0, 0] },
      },
      {
        name: 'Returning',
        type: 'line',
        data: ordered.map((row) => row.returningCustomers),
        lineStyle: { color: '#34d399', width: 2 },
        itemStyle: { color: '#34d399' },
        smooth: true,
      },
    ],
  });
}

function getParetoOption(customers: CustomerRetentionCustomer[]): EChartsOption {
  const sorted = [...customers].sort((a, b) => b.totalGMV - a.totalGMV).slice(0, 20);
  const totalGMV = sorted.reduce((sum, customer) => sum + customer.totalGMV, 0);
  let cumulative = 0;

  return mergeChartOptions({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 52, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map((customer) => compact(customer.customer, 15)),
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, rotate: 45 },
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
        name: 'Cumulative %',
        max: 100,
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: '{value}%' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'GMV',
        type: 'bar',
        data: sorted.map((customer, index) => ({
          value: customer.totalGMV,
          itemStyle: { color: chartColors.primary[index % chartColors.primary.length], borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: '50%',
      },
      {
        name: 'Cumulative %',
        type: 'line',
        yAxisIndex: 1,
        data: sorted.map((customer) => {
          cumulative += customer.totalGMV;
          return totalGMV ? Math.round((cumulative / totalGMV) * 100) : 0;
        }),
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  });
}

const emptyRetention: CustomerRetentionAnalytics = {
  summary: {
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
  },
  channels: [],
  monthly: [],
  customers: [],
};

export default function CustomersPage() {
  const { data } = useDashboardData();
  const retention = data?.customerRetentionAnalytics ?? emptyRetention;
  const customers = retention.customers;
  const repeatCustomers = customers.filter((customer) => customer.purchaseCount > 1);

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Total Customers" value={retention.summary.uniqueCustomers.toLocaleString('id-ID')} icon={<Users className="h-5 w-5" />} />
        <KPICard label="One-time Buyers" value={retention.summary.oneTimeCustomers.toLocaleString('id-ID')} icon={<UserPlus className="h-5 w-5" />} />
        <KPICard label="Repeat Rate" value={formatPercent(retention.summary.repeatRate)} icon={<Repeat className="h-5 w-5" />} />
        <KPICard label="Avg Frequency" value={`${retention.summary.avgPurchaseFrequency.toFixed(2)}x`} icon={<BarChart3 className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top Customers by GMV" subtitle="Current filter, all channels combined">
          <EChart option={getTopCustomerBarOption(customers)} style={{ height: 350 }} />
        </ChartCard>
        <ChartCard title="Customer Value vs Frequency" subtitle="Purchase count vs GMV, bubble = active months">
          <EChart option={getRFMScatterOption(customers)} style={{ height: 350 }} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="One-time vs Repeat" subtitle="Customer composition donut">
          <EChart option={getRepeatDonutOption(retention)} style={{ height: 300 }} />
        </ChartCard>
        <ChartCard title="Retention Trend" subtitle="One-time, repeat, and returning customers by month/channel">
          <EChart option={getMonthlyRetentionOption(retention)} style={{ height: 300 }} />
        </ChartCard>
      </div>

      <ChartCard title="Customer Concentration (Pareto)" subtitle="GMV share and cumulative contribution">
        <EChart option={getParetoOption(customers)} style={{ height: 300 }} />
      </ChartCard>

      <ChartCard title="Repeat Buyer Table" subtitle="Customers with more than one purchase in the current filter">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4 text-right">Purchases</th>
                <th className="pb-3 pr-4 text-right">Active Months</th>
                <th className="pb-3 pr-4 text-right">Total GMV</th>
                <th className="pb-3 pr-4 text-right">First Order</th>
                <th className="pb-3 text-right">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {repeatCustomers.map((customer, index) => (
                <tr key={`${customer.channelKey}-${customer.customer}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>{index + 1}</span></td>
                  <td className="py-3 pr-4 font-medium text-foreground">{customer.customer}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{customer.channel}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{customer.purchaseCount}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{customer.activeMonths}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(customer.totalGMV)}</td>
                  <td className="py-3 pr-4 text-right text-xs text-muted-foreground">{customer.firstOrder?.slice(0, 10) ?? '-'}</td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{customer.lastOrder?.slice(0, 10) ?? '-'}</td>
                </tr>
              ))}
              {!repeatCustomers.length && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No repeat buyers in the current filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Customer / Buyer Table" subtitle="All tracked customers from normalized orders">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Segment</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4 text-right">Purchases</th>
                <th className="pb-3 pr-4 text-right">Total GMV</th>
                <th className="pb-3 pr-4 text-right">First Order</th>
                <th className="pb-3 text-right">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {[...customers].sort((a, b) => b.totalGMV - a.totalGMV).map((customer, index) => (
                <tr key={`${customer.channelKey}-${customer.customer}-${index}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>{index + 1}</span></td>
                  <td className="py-3 pr-4 font-medium text-foreground">{customer.customer}</td>
                  <td className="py-3 pr-4"><span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{customer.segment}</span></td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{customer.channel}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{customer.purchaseCount}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(customer.totalGMV)}</td>
                  <td className="py-3 pr-4 text-right text-xs text-muted-foreground">{customer.firstOrder?.slice(0, 10) ?? '-'}</td>
                  <td className="py-3 text-right text-xs text-muted-foreground">{customer.lastOrder?.slice(0, 10) ?? '-'}</td>
                </tr>
              ))}
              {!customers.length && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No customer data available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
