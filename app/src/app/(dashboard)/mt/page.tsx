'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, abbreviateIDR } from '@/lib/format';
import { Building2, ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import type { EChartsOption } from 'echarts';

// MT mock data from PRD §1.1 and §1.4
const mtSummary = {
  bookedGMV: 413_818_000,
  activeGMV: 363_898_000,
  orders: 12,
  aov: 34_484_833,
  cancelledOrders: 2,
  cancelRate: 16.7,
};

const mtSKUs = [
  { skuCode: 'NR-KP-DZJ-001-SEA', skuName: 'Kayou - NARUTO Earth Scroll Series 1S', mtGMV: 272_160_000, quantity: 1_512, orders: 5 },
  { skuCode: 'KYID000004', skuName: 'MLBB-HOD-1 packSet', mtGMV: 38_400_000, quantity: 1_920, orders: 2 },
  { skuCode: 'KYID000005', skuName: 'Free Fire Final Survivor Survival Pack', mtGMV: 38_400_000, quantity: 1_920, orders: 2 },
  { skuCode: 'KYID000001', skuName: 'Kayou - MLBB ORIGIN OF LEGEND', mtGMV: 23_940_000, quantity: 133, orders: 3 },
  { skuCode: 'MLBB-KP-GXMY-001B-SEA', skuName: 'MLBB-OOL-1 packSet', mtGMV: 23_040_000, quantity: 2_880, orders: 2 },
  { skuCode: 'MLP-KP-YH-QY-002-SEA', skuName: 'Kayou - My Little Pony Fun Moments', mtGMV: 12_240_000, quantity: 68, orders: 2 },
  { skuCode: 'kayou-card_album-MLBB', skuName: 'Kayou - Card Album MLBB', mtGMV: 4_088_000, quantity: 146, orders: 3 },
  { skuCode: 'KYWL680000020', skuName: 'Kayou - Scratch Card', mtGMV: 1_149_000, quantity: 11_490, orders: 4 },
  { skuCode: 'POSM-Kayou-MLBB-01', skuName: 'Kayou - MLBB Display Rack', mtGMV: 400_000, quantity: 2, orders: 1 },
];

// Donut: SKU mix
function getSKUMixOption(): EChartsOption {
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
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
        },
        data: mtSKUs.slice(0, 6).map((s, i) => ({
          value: s.mtGMV,
          name: s.skuName.length > 25 ? s.skuName.slice(0, 25) + '…' : s.skuName,
          itemStyle: { color: chartColors.primary[i] },
        })),
      },
    ],
  });
}

// Combo: Booked vs Active GMV
function getComboOption(): EChartsOption {
  // Simulate monthly trend for MT
  const months = ['Jan', 'Feb', 'Mar', 'Apr'];
  const bookedData = [280_000_000, 320_000_000, 370_000_000, 413_818_000];
  const activeData = [250_000_000, 290_000_000, 340_000_000, 363_898_000];
  const orderData = [8, 9, 11, 12];

  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: months,
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
        data: bookedData,
        itemStyle: { color: chartColors.channels.mt, borderRadius: [4, 4, 0, 0] },
        barWidth: '30%',
      },
      {
        name: 'Active GMV',
        type: 'bar',
        data: activeData,
        itemStyle: { color: chartColors.channels.mt + '70', borderRadius: [4, 4, 0, 0] },
        barWidth: '30%',
      },
      {
        name: 'Orders',
        type: 'line',
        yAxisIndex: 1,
        data: orderData,
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  });
}

// Status funnel
function getStatusFunnelOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 16,
        bottom: 16,
        width: '80%',
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
        itemStyle: {
          borderColor: 'rgba(0,0,0,0.3)',
          borderWidth: 1,
        },
        data: [
          { value: 100, name: 'Total Orders (12)', itemStyle: { color: chartColors.primary[2] } },
          { value: 83.3, name: 'Received (10)', itemStyle: { color: chartColors.primary[1] } },
          { value: 75, name: 'Active (9)', itemStyle: { color: chartColors.primary[5] } },
          { value: 16.7, name: 'Cancelled (2)', itemStyle: { color: chartColors.primary[4] } },
        ],
      },
    ],
  });
}

// Top SKU horizontal bar
function getTopSKUBarOption(): EChartsOption {
  const sorted = [...mtSKUs].sort((a, b) => b.mtGMV - a.mtGMV).slice(0, 7);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        return `<strong>${p.name}</strong><br/>${formatIDR(p.value)}`;
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
      data: sorted.map((s) => s.skuName.slice(0, 28)),
      inverse: true,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, width: 150, overflow: 'truncate' as const },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((s, i) => ({
          value: s.mtGMV,
          itemStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: chartColors.primary[i % chartColors.primary.length] + '88' },
                { offset: 1, color: chartColors.primary[i % chartColors.primary.length] },
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

export default function MTPerformancePage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label="MT Booked GMV"
          value={abbreviateIDR(mtSummary.bookedGMV)}
          change={11.8}
          changeLabel="vs prev month"
          icon={<Building2 className="h-5 w-5" />}
        />
        <KPICard
          label="MT Active GMV"
          value={abbreviateIDR(mtSummary.activeGMV)}
          change={9.2}
          changeLabel="vs prev month"
          icon={<Package className="h-5 w-5" />}
        />
        <KPICard
          label="MT Orders"
          value={mtSummary.orders.toString()}
          change={20.0}
          changeLabel="vs prev month"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          label="Cancel Rate"
          value={`${mtSummary.cancelRate}%`}
          change={-5.2}
          changeLabel="vs prev month"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
        <p className="text-sm text-purple-300">
          <strong>MT / Agency rule:</strong> Rows where <code className="rounded bg-purple-500/15 px-1.5 py-0.5 text-xs">Area Manager = &quot;Agency&quot;</code> are classified as Modern Trade.
          MT is driven by high-value bulk orders with AOV of <strong>{formatIDR(mtSummary.aov)}</strong> — the highest across all channels.
        </p>
      </div>

      {/* Charts Row 1: SKU Mix + Combo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="SKU Mix"
          subtitle="MT GMV contribution by product"
        >
          <EChart option={getSKUMixOption()} style={{ height: 320 }} />
        </ChartCard>

        <ChartCard
          title="Booked vs Active GMV"
          subtitle="Monthly trend with order count"
        >
          <EChart option={getComboOption()} style={{ height: 320 }} />
        </ChartCard>
      </div>

      {/* Charts Row 2: Status Funnel + Top SKU */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Order Status Funnel"
          subtitle="MT order lifecycle"
        >
          <EChart option={getStatusFunnelOption()} style={{ height: 320 }} />
        </ChartCard>

        <ChartCard
          title="Top Bulk SKU"
          subtitle="Ranked by MT GMV"
        >
          <EChart option={getTopSKUBarOption()} style={{ height: 320 }} />
        </ChartCard>
      </div>

      {/* MT SKU Table */}
      <ChartCard title="MT / Agency SKU Performance" subtitle="All SKUs sold through Modern Trade channel">
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
              {[...mtSKUs].sort((a, b) => b.mtGMV - a.mtGMV).map((sku, i) => (
                <tr key={sku.skuCode} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-purple-500/15 text-purple-400' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{sku.skuCode}</td>
                  <td className="max-w-[200px] truncate py-3 pr-4 font-medium text-foreground" title={sku.skuName}>{sku.skuName}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(sku.mtGMV)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{sku.quantity.toLocaleString('id-ID')}</td>
                  <td className="py-3 text-right text-foreground">{sku.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
