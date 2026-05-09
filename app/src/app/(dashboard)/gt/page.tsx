'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { regionalManagers, areaManagers, gtSKUs } from '@/data/mock/gt-performance';
import { gtRegionSKUHeatmap, gtParetoSKU } from '@/data/mock/phase-completion';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, abbreviateIDR } from '@/lib/format';
import { Store, Users, ShoppingCart, Target } from 'lucide-react';
import type { EChartsOption } from 'echarts';

const totalGTGMV = regionalManagers.reduce((s, m) => s + m.bookedGMV, 0);
const totalGTOrders = regionalManagers.reduce((s, m) => s + m.orders, 0);
const totalGTCustomers = regionalManagers.reduce((s, m) => s + m.customers, 0);

// Lollipop chart for Area Manager ranking (with scatter dots for lollipop effect)
function getLollipopOption(): EChartsOption {
  const sorted = [...areaManagers].sort((a, b) => a.bookedGMV - b.bookedGMV);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        const mgr = areaManagers.find((m) => m.name.split(' ').slice(0, 2).join(' ') === p.name || m.name === p.name);
        return `<strong>${mgr?.name ?? p.name}</strong><br/>
          GMV: ${formatIDR(p.value)}<br/>
          Orders: ${mgr?.orders ?? '-'}<br/>
          Customers: ${mgr?.customers ?? '-'}<br/>
          Qty: ${mgr?.quantity?.toLocaleString('id-ID') ?? '-'}`;
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
      data: sorted.map((m) => m.name.split(' ').slice(0, 2).join(' ')),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      // Thin bar (lollipop stick)
      {
        type: 'bar',
        data: sorted.map((m, i) => ({
          value: m.bookedGMV,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: chartColors.primary[i % chartColors.primary.length] + '44' },
                { offset: 1, color: chartColors.primary[i % chartColors.primary.length] + 'AA' },
              ],
            },
            borderRadius: [0, 6, 6, 0],
          },
        })),
        barWidth: 6,
        z: 1,
      },
      // Scatter dots (lollipop head)
      {
        type: 'scatter',
        data: sorted.map((m, i) => ({
          value: [m.bookedGMV, i],
          itemStyle: {
            color: chartColors.primary[i % chartColors.primary.length],
            shadowBlur: 8,
            shadowColor: chartColors.primary[i % chartColors.primary.length] + '60',
          },
        })),
        symbolSize: 14,
        z: 2,
      },
    ],
  });
}

// Bubble chart: GMV vs Orders vs Quantity
function getBubbleOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: number[]; seriesName: string };
        const mgr = areaManagers[p.data[3]];
        return `<strong>${mgr?.name}</strong><br/>
          GMV: ${formatIDR(p.data[0])}<br/>
          Orders: ${p.data[1]}<br/>
          Qty: ${p.data[2].toLocaleString('id-ID')}`;
      },
    },
    grid: { left: 12, right: 24, top: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'GMV',
      nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        formatter: (v: number) => abbreviateIDR(v),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      name: 'Orders',
      nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (data: number[]) => Math.max(Math.sqrt(data[2]) * 1.5, 15),
        data: areaManagers.map((m, i) => [m.bookedGMV, m.orders, m.quantity, i]),
        itemStyle: {
          color: ((params: { dataIndex: number }) =>
            chartColors.primary[params.dataIndex % chartColors.primary.length]) as unknown as string,
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.3)',
        },
        label: {
          show: true,
          formatter: ((params: { data: number[] }) => {
            const mgr = areaManagers[params.data[3]];
            return mgr?.name.split(' ')[0] ?? '';
          }) as unknown as string,
          position: 'top',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 10,
        },
      },
    ],
  });
}

// Regional Manager grouped bar
function getRegionalBarOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: regionalManagers.map((m) => m.name.split(' ').slice(0, 2).join(' ')),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'GMV',
        axisLabel: {
          color: 'rgba(255,255,255,0.5)',
          fontSize: 10,
          formatter: (v: number) => abbreviateIDR(v),
        },
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
        data: regionalManagers.map((m) => m.bookedGMV),
        itemStyle: { color: chartColors.channels.gt, borderRadius: [4, 4, 0, 0] },
        barWidth: '30%',
      },
      {
        name: 'Active GMV',
        type: 'bar',
        data: regionalManagers.map((m) => m.activeGMV),
        itemStyle: { color: chartColors.channels.mt, borderRadius: [4, 4, 0, 0] },
        barWidth: '30%',
      },
      {
        name: 'Orders',
        type: 'line',
        yAxisIndex: 1,
        data: regionalManagers.map((m) => m.orders),
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  });
}

// Heatmap: Region × SKU
function getHeatmapOption(): EChartsOption {
  const regions = [...new Set(gtRegionSKUHeatmap.map(h => h.region))];
  const skus = [...new Set(gtRegionSKUHeatmap.map(h => h.sku))];
  const data = gtRegionSKUHeatmap.map(h => [skus.indexOf(h.sku), regions.indexOf(h.region), h.gmv]);
  const maxGMV = Math.max(...gtRegionSKUHeatmap.map(h => h.gmv));

  return mergeChartOptions({
    tooltip: {
      position: 'top',
      formatter: (params: unknown) => {
        const p = params as { data: number[] };
        return `<strong>${regions[p.data[1]]}</strong> × ${skus[p.data[0]]}<br/>${formatIDR(p.data[2])}`;
      },
    },
    grid: { left: 12, right: 24, top: 8, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: skus,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
    },
    yAxis: {
      type: 'category',
      data: regions,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: maxGMV,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
      inRange: { color: ['#0e1726', '#06b6d4', '#6366f1', '#a855f7'] },
      formatter: (value: number) => abbreviateIDR(value),
    },
    series: [{
      type: 'heatmap',
      data: data,
      label: {
        show: true,
        color: '#fff',
        fontSize: 9,
        formatter: (params: unknown) => abbreviateIDR((params as { data: number[] }).data[2]),
      },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  });
}

// Pareto: SKU contribution
function getParetoOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: gtParetoSKU.map(s => s.sku),
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, rotate: 30 },
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
        data: gtParetoSKU.map((s, i) => ({
          value: s.gmv,
          itemStyle: { color: chartColors.primary[i % chartColors.primary.length], borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: '50%',
      },
      {
        name: 'Cumulative %',
        type: 'line',
        yAxisIndex: 1,
        data: gtParetoSKU.map(s => s.cumulativePercent),
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  });
}

export default function GTPerformancePage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label="GT Booked GMV"
          value={abbreviateIDR(totalGTGMV)}
          change={12.3}
          changeLabel="vs prev month"
          icon={<Store className="h-5 w-5" />}
        />
        <KPICard
          label="GT Orders"
          value={totalGTOrders.toString()}
          change={8.1}
          changeLabel="vs prev month"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          label="GT Customers"
          value={totalGTCustomers.toString()}
          change={15.4}
          changeLabel="vs prev month"
          icon={<Users className="h-5 w-5" />}
        />
        <KPICard
          label="Active Rate"
          value="81.3%"
          change={-2.1}
          changeLabel="vs prev month"
          icon={<Target className="h-5 w-5" />}
        />
      </div>

      {/* Area Manager Lollipop + Regional Bar */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Area Manager GMV Ranking"
          subtitle="Lollipop chart — Booked GMV by Area Manager"
        >
          <EChart option={getLollipopOption()} style={{ height: 320 }} />
        </ChartCard>

        <ChartCard
          title="Regional Manager Performance"
          subtitle="GMV bars + order count line"
        >
          <EChart option={getRegionalBarOption()} style={{ height: 320 }} />
        </ChartCard>
      </div>

      {/* Bubble chart */}
      <ChartCard
        title="GMV vs Orders vs Quantity"
        subtitle="Bubble size = quantity sold"
      >
        <EChart option={getBubbleOption()} style={{ height: 360 }} />
      </ChartCard>

      {/* Heatmap + Pareto */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Region × SKU Heatmap"
          subtitle="GMV intensity by Area Manager and product"
        >
          <EChart option={getHeatmapOption()} style={{ height: 360 }} />
        </ChartCard>

        <ChartCard
          title="SKU Contribution (Pareto)"
          subtitle="GT GMV + cumulative % — 80/20 analysis"
        >
          <EChart option={getParetoOption()} style={{ height: 360 }} />
        </ChartCard>
      </div>

      {/* Manager Leaderboard Table */}
      <ChartCard title="Area Manager Leaderboard" subtitle="Ranked by Booked GMV">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Area Manager</th>
                <th className="pb-3 pr-4">Regional Manager</th>
                <th className="pb-3 pr-4 text-right">Orders</th>
                <th className="pb-3 pr-4 text-right">Active</th>
                <th className="pb-3 pr-4 text-right">Booked GMV</th>
                <th className="pb-3 pr-4 text-right">Qty</th>
                <th className="pb-3 text-right">Customers</th>
              </tr>
            </thead>
            <tbody>
              {[...areaManagers]
                .sort((a, b) => b.bookedGMV - a.bookedGMV)
                .map((m, i) => (
                  <tr key={m.name} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="py-3 pr-4">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-foreground">{m.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.parentManager}</td>
                    <td className="py-3 pr-4 text-right text-foreground">{m.orders}</td>
                    <td className="py-3 pr-4 text-right text-foreground">{m.activeOrders}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(m.bookedGMV)}</td>
                    <td className="py-3 pr-4 text-right text-foreground">{m.quantity.toLocaleString('id-ID')}</td>
                    <td className="py-3 text-right text-foreground">{m.customers}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
