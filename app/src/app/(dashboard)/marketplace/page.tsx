'use client';

import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { marketplacePerformance, marketplaceSKUs, orderStatuses } from '@/data/mock/marketplace';
import { marketplaceDailyGMV, marketplaceRefundWaterfall } from '@/data/mock/phase-completion';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, abbreviateIDR } from '@/lib/format';
import { ShoppingBag, AlertTriangle, RotateCcw, TrendingUp } from 'lucide-react';
import type { EChartsOption } from 'echarts';

const totalMPGMV = marketplacePerformance.reduce((s, m) => s + m.bookedGMV, 0);
const totalMPOrders = marketplacePerformance.reduce((s, m) => s + m.orders, 0);
const totalRefunds = marketplacePerformance.reduce((s, m) => s + m.refundAmount, 0);

// Grouped bar: GMV by marketplace
function getGroupedBarOption(): EChartsOption {
  const mpColors = [chartColors.channels.tiktok1, chartColors.channels.shopee, chartColors.channels.tiktok2];
  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: marketplacePerformance.map((m) => m.marketplace),
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
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
    series: [
      {
        name: 'Booked GMV',
        type: 'bar',
        data: marketplacePerformance.map((m, i) => ({
          value: m.bookedGMV,
          itemStyle: { color: mpColors[i], borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: '25%',
      },
      {
        name: 'Active GMV',
        type: 'bar',
        data: marketplacePerformance.map((m, i) => ({
          value: m.activeGMV,
          itemStyle: { color: mpColors[i] + '80', borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: '25%',
      },
    ],
  });
}

// Multi-line daily GMV by shop
function getDailyGMVByShopOption(): EChartsOption {
  const shops = [
    { key: 'tiktok1' as const, name: 'TT Kayou ID', color: chartColors.channels.tiktok1 },
    { key: 'shopee' as const, name: 'Shopee', color: chartColors.channels.shopee },
    { key: 'tiktok2' as const, name: 'TT Kayou Card', color: chartColors.channels.tiktok2 },
  ];

  return mergeChartOptions({
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const pList = params as Array<{ seriesName: string; value: number; marker: string }>;
        let html = `<strong>${(params as Array<{ axisValue: string }>)[0]?.axisValue}</strong><br/>`;
        pList.forEach(p => { html += `${p.marker} ${p.seriesName}: ${abbreviateIDR(p.value)}<br/>`; });
        return html;
      },
    },
    legend: { bottom: 0, textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 } },
    grid: { left: 12, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: marketplaceDailyGMV.map(d => d.date.slice(5)),
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, rotate: 45 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: shops.map(sh => ({
      name: sh.name,
      type: 'line' as const,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: sh.color },
      areaStyle: {
        color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: sh.color + '25' }, { offset: 1, color: sh.color + '05' }] },
      },
      data: marketplaceDailyGMV.map(d => d[sh.key]),
    })),
  });
}

// Cancellation donut
function getCancellationDonutOption(): EChartsOption {
  const mpStatuses = orderStatuses.filter(
    (s) => s.source !== 'B2B GT+MT' && (s.status === 'Canceled' || s.status === 'Batal')
  );
  const colors = [chartColors.channels.tiktok1, chartColors.channels.tiktok2, chartColors.channels.shopee];

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number };
        return `<strong>${p.name}</strong><br/>Cancelled: ${p.value} orders<br/>${p.percent}%`;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' },
        },
        data: mpStatuses.map((s, i) => ({
          value: s.orders,
          name: s.source,
          itemStyle: { color: colors[i] },
        })),
      },
    ],
  });
}

// Status funnel per marketplace
function getFunnelOption(): EChartsOption {
  return mergeChartOptions({
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 16,
        bottom: 40,
        width: '80%',
        min: 0,
        max: 100,
        sort: 'descending',
        gap: 3,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 11,
          formatter: '{b}: {c}%',
        },
        itemStyle: {
          borderColor: 'rgba(0,0,0,0.3)',
          borderWidth: 1,
        },
        data: [
          { value: 100, name: 'Total Orders', itemStyle: { color: chartColors.primary[0] } },
          { value: 68, name: 'Shipped', itemStyle: { color: chartColors.primary[1] } },
          { value: 52, name: 'Completed', itemStyle: { color: chartColors.primary[5] } },
          { value: 25, name: 'Cancelled', itemStyle: { color: chartColors.primary[4] } },
        ],
      },
    ],
  });
}

// Scatter: AOV vs cancellation rate
function getScatterOption(): EChartsOption {
  const data = marketplacePerformance.map((m) => {
    const cancelledOrders = orderStatuses
      .filter((s) => s.source.includes(m.marketplace.replace('TikTok Shop ', 'TikTok Shop ')) && (s.status === 'Canceled' || s.status === 'Batal'))
      .reduce((s, o) => s + o.orders, 0);
    const cancelRate = (cancelledOrders / m.orders) * 100;
    return [m.aov, cancelRate, m.orders, m.marketplace];
  });

  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number, string] };
        return `<strong>${p.data[3]}</strong><br/>
          AOV: ${formatIDR(p.data[0])}<br/>
          Cancel Rate: ${p.data[1].toFixed(1)}%<br/>
          Orders: ${p.data[2].toLocaleString('id-ID')}`;
      },
    },
    grid: { left: 12, right: 24, top: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'AOV',
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
      name: 'Cancel Rate %',
      nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (val: number[]) => Math.max(Math.sqrt(val[2]) * 1.2, 20),
        data: data,
        itemStyle: {
          color: ((params: { dataIndex: number }) => {
            const colors = [chartColors.channels.tiktok1, chartColors.channels.shopee, chartColors.channels.tiktok2];
            return colors[params.dataIndex] ?? chartColors.primary[0];
          }) as unknown as string,
          shadowBlur: 12,
          shadowColor: 'rgba(0,0,0,0.25)',
        },
        label: {
          show: true,
          formatter: ((params: { data: [number, number, number, string] }) => params.data[3].replace('TikTok Shop ', 'TT ')) as unknown as string,
          position: 'top',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 10,
        },
      },
    ],
  });
}

// Refund waterfall
function getRefundWaterfallOption(): EChartsOption {
  const w = marketplaceRefundWaterfall;
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
      data: ['Gross GMV', 'Discount', 'Refund', 'Active GMV'],
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
        data: [0, w.activeGMV + w.refundAmount, w.activeGMV, 0],
      },
      {
        name: 'GMV',
        type: 'bar',
        stack: 'waterfall',
        barWidth: '40%',
        label: { show: true, position: 'top', color: 'rgba(255,255,255,0.7)', fontSize: 10, formatter: (p: { value: number }) => abbreviateIDR(p.value) },
        data: [
          { value: w.grossGMV, itemStyle: { color: chartColors.primary[1], borderRadius: [4, 4, 0, 0] } },
          { value: w.discount, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
          { value: w.refundAmount, itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] } },
          { value: w.activeGMV, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
        ],
      },
    ],
  });
}

export default function MarketplacePage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label="Marketplace GMV"
          value={abbreviateIDR(totalMPGMV)}
          change={18.5}
          changeLabel="vs prev month"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <KPICard
          label="Total Orders"
          value={totalMPOrders.toLocaleString('id-ID')}
          change={22.1}
          changeLabel="vs prev month"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          label="Total Refund"
          value={abbreviateIDR(totalRefunds)}
          change={8.3}
          changeLabel="vs prev month"
          icon={<RotateCcw className="h-5 w-5" />}
        />
        <KPICard
          label="Cancellation Alert"
          value="TikTok Shop (Kayou Card ID)"
          change={57.9}
          changeLabel="cancel rate"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="GMV by Marketplace"
          subtitle="Booked vs Active GMV"
        >
          <EChart option={getGroupedBarOption()} style={{ height: 300 }} />
        </ChartCard>

        <ChartCard
          title="Daily GMV by Shop"
          subtitle="Multi-line trend — April 2026"
        >
          <EChart option={getDailyGMVByShopOption()} style={{ height: 300 }} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Cancellation Share"
          subtitle="Cancelled orders by marketplace"
        >
          <EChart option={getCancellationDonutOption()} style={{ height: 300 }} />
        </ChartCard>

        <ChartCard
          title="Refund Waterfall"
          subtitle="Gross GMV → Discount → Refund → Active"
        >
          <EChart option={getRefundWaterfallOption()} style={{ height: 300 }} />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Order Lifecycle Funnel"
          subtitle="All marketplaces combined"
        >
          <EChart option={getFunnelOption()} style={{ height: 300 }} />
        </ChartCard>

        <ChartCard
          title="AOV vs Cancellation Rate"
          subtitle="Bubble size = order volume"
        >
          <EChart option={getScatterOption()} style={{ height: 300 }} />
        </ChartCard>
      </div>

      {/* Top Marketplace SKU Table */}
      <ChartCard title="Top Marketplace SKUs" subtitle="Ranked by SKU GMV across all shops">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4 text-right">SKU GMV</th>
                <th className="pb-3 pr-4 text-right">Qty</th>
                <th className="pb-3 pr-4 text-right">Orders</th>
                <th className="pb-3 pr-4 text-right">TT Kayou ID</th>
                <th className="pb-3 pr-4 text-right">TT Kayou Card</th>
                <th className="pb-3 text-right">Shopee</th>
              </tr>
            </thead>
            <tbody>
              {marketplaceSKUs.map((sku, i) => (
                <tr key={sku.sellerSKU} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="max-w-[250px] truncate py-3 pr-4 font-medium text-foreground" title={sku.productName}>
                    {sku.productName}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatIDR(sku.skuGMV)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{sku.quantity.toLocaleString('id-ID')}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{sku.orders.toLocaleString('id-ID')}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(sku.tiktok1)}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{formatIDR(sku.tiktok2)}</td>
                  <td className="py-3 text-right text-foreground">{formatIDR(sku.shopee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
