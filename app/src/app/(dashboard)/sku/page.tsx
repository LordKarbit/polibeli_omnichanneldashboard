'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { allSKUs, skuByIP, skuTypes } from '@/data/mock/sku-analytics';
import { skuGrowthDrop, skuChannelMatrix } from '@/data/mock/phase-completion';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, abbreviateIDR } from '@/lib/format';
import { Package, Layers, Tag, BarChart3 } from 'lucide-react';
import type { EChartsOption } from 'echarts';

const totalSKUGMV = allSKUs.reduce((s, sku) => s + sku.totalGMV, 0);
const uniqueSKUs = allSKUs.length;

// Horizontal bar: Top SKU by GMV
function getTopSKUBarOption(): EChartsOption {
  const sorted = [...allSKUs].sort((a, b) => b.totalGMV - a.totalGMV).slice(0, 8);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number; marker: string }>)[0];
        const sku = allSKUs.find((s) => s.skuName.slice(0, 30) === p.name);
        return `<strong>${sku?.skuName ?? p.name}</strong><br/>
          GMV: ${formatIDR(p.value)}<br/>
          GT: ${formatIDR(sku?.gtGMV ?? 0)}<br/>
          MT: ${formatIDR(sku?.mtGMV ?? 0)}`;
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
      data: sorted.map((s) => s.skuName.slice(0, 30)),
      inverse: true,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, width: 150, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((s, i) => ({
          value: s.totalGMV,
          itemStyle: {
            color: {
              type: 'linear',
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

// Treemap by IP
function getTreemapOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number };
        return `<strong>${p.name}</strong><br/>${formatIDR(p.value)}`;
      },
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        width: '100%',
        height: '100%',
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: '{b}\n{c}',
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
        },
        itemStyle: {
          borderColor: 'rgba(0,0,0,0.4)',
          borderWidth: 2,
          gapWidth: 2,
        },
        levels: [
          {
            itemStyle: { borderWidth: 0, gapWidth: 3 },
          },
        ],
        data: skuByIP.map((ip, i) => ({
          name: ip.ip,
          value: ip.gmv,
          itemStyle: {
            color: chartColors.primary[i % chartColors.primary.length],
          },
        })),
      },
    ],
  });
}

// SKU type donut
function getSKUTypeDonutOption(): EChartsOption {
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
        radius: ['42%', '68%'],
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' },
        },
        data: skuTypes.map((t, i) => ({
          value: t.gmv,
          name: t.type,
          itemStyle: { color: chartColors.primary[i] },
        })),
      },
    ],
  });
}

// Bubble: Qty vs GMV
function getBubbleOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number, string] };
        return `<strong>${p.data[3]}</strong><br/>
          GMV: ${formatIDR(p.data[0])}<br/>
          Qty: ${p.data[1].toLocaleString('id-ID')}<br/>
          Orders: ${p.data[2]}`;
      },
    },
    grid: { left: 12, right: 24, top: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Total GMV',
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        formatter: (v: number) => abbreviateIDR(v),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      name: 'Quantity',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (data: number[]) => Math.max(Math.sqrt(data[2]) * 3, 12),
        data: allSKUs.map((s) => [s.totalGMV, s.quantity, s.orders, s.skuName.slice(0, 25)]),
        itemStyle: {
          color: ((params: { dataIndex: number }) =>
            chartColors.primary[params.dataIndex % chartColors.primary.length]) as unknown as string,
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.25)',
        },
      },
    ],
  });
}

// Lollipop: SKU growth/drop
function getGrowthLollipopOption(): EChartsOption {
  const sorted = [...skuGrowthDrop].sort((a, b) => a.growth - b.growth);

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        return `<strong>${p.name}</strong><br/>Growth: ${p.value > 0 ? '+' : ''}${p.value}%`;
      },
    },
    grid: { left: 12, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.sku),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map(s => ({
          value: s.growth,
          itemStyle: {
            color: s.growth >= 0 ? '#10b981' : '#ef4444',
            borderRadius: s.growth >= 0 ? [0, 6, 6, 0] : [6, 0, 0, 6],
          },
        })),
        barWidth: 6,
        z: 1,
      },
      {
        type: 'scatter',
        data: sorted.map((s, i) => ({
          value: [s.growth, i],
          itemStyle: {
            color: s.growth >= 0 ? '#10b981' : '#ef4444',
            shadowBlur: 6,
            shadowColor: (s.growth >= 0 ? '#10b981' : '#ef4444') + '60',
          },
        })),
        symbolSize: 12,
        z: 2,
      },
    ],
  });
}

export default function SKUPage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label="Total SKU GMV"
          value={abbreviateIDR(totalSKUGMV)}
          change={14.2}
          changeLabel="vs prev month"
          icon={<Package className="h-5 w-5" />}
        />
        <KPICard
          label="Unique SKUs"
          value={uniqueSKUs.toString()}
          icon={<Tag className="h-5 w-5" />}
        />
        <KPICard
          label="Top IP"
          value="MLBB"
          change={12.0}
          changeLabel="contribution"
          icon={<Layers className="h-5 w-5" />}
        />
        <KPICard
          label="Avg GMV/SKU"
          value={abbreviateIDR(totalSKUGMV / uniqueSKUs)}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Top SKU + Treemap */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Top SKU by GMV"
          subtitle="B2B GT + MT combined"
        >
          <EChart option={getTopSKUBarOption()} style={{ height: 350 }} />
        </ChartCard>

        <ChartCard
          title="IP Contribution Treemap"
          subtitle="GMV share by intellectual property"
        >
          <EChart option={getTreemapOption()} style={{ height: 350 }} />
        </ChartCard>
      </div>

      {/* SKU Type + Growth/Drop Lollipop */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="SKU Type Distribution"
          subtitle="Paid vs POSM vs Supporting"
        >
          <EChart option={getSKUTypeDonutOption()} style={{ height: 300 }} />
        </ChartCard>

        <ChartCard
          title="SKU Growth / Drop"
          subtitle="Lollipop — MoM change % by SKU"
        >
          <EChart option={getGrowthLollipopOption()} style={{ height: 300 }} />
        </ChartCard>
      </div>

      {/* Bubble chart */}
      <ChartCard
        title="Quantity vs GMV"
        subtitle="Bubble size = orders"
      >
        <EChart option={getBubbleOption()} style={{ height: 300 }} />
      </ChartCard>

      {/* SKU × Channel Matrix */}
      <ChartCard title="SKU × Channel Matrix" subtitle="GMV breakdown by product and channel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">SKU</th>
                <th className="pb-3 pr-4 text-right">GT</th>
                <th className="pb-3 pr-4 text-right">MT</th>
                <th className="pb-3 pr-4 text-right">Shopee</th>
                <th className="pb-3 pr-4 text-right">TT Kayou ID</th>
                <th className="pb-3 text-right">TT Kayou Card</th>
              </tr>
            </thead>
            <tbody>
              {skuChannelMatrix.map((row) => (
                <tr key={row.sku} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4 font-medium text-foreground">{row.sku}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{row.gt > 0 ? formatIDR(row.gt) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{row.mt > 0 ? formatIDR(row.mt) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{row.shopee > 0 ? formatIDR(row.shopee) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{row.tiktok1 > 0 ? formatIDR(row.tiktok1) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-3 text-right text-foreground">{row.tiktok2 > 0 ? formatIDR(row.tiktok2) : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Full SKU Table */}
      <ChartCard title="SKU Performance Table" subtitle="All B2B SKUs with GT/MT split">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">SKU Code</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4 text-right">Total GMV</th>
                <th className="pb-3 pr-4 text-right">GT GMV</th>
                <th className="pb-3 pr-4 text-right">MT GMV</th>
                <th className="pb-3 pr-4 text-right">Qty</th>
                <th className="pb-3 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {[...allSKUs].sort((a, b) => b.totalGMV - a.totalGMV).map((sku) => (
                <tr key={sku.skuCode} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{sku.skuCode}</td>
                  <td className="max-w-[200px] truncate py-3 pr-4 font-medium text-foreground" title={sku.skuName}>{sku.skuName}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(sku.totalGMV)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(sku.gtGMV)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(sku.mtGMV)}</td>
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
