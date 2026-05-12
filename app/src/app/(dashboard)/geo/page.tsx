'use client';

import { useRef, useState } from 'react';
import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { MapLibreGeoHeatmap, type MapLibreGeoHeatmapHandle } from '@/components/geo/maplibre-geo-heatmap';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, formatNumber, formatPercent, abbreviateIDR } from '@/lib/format';
import { MapPin, Building, Globe, TrendingUp, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { useDashboardData, type CustomerRetentionAnalytics } from '@/lib/dashboard-client';
import type { LocationGMV } from '@/lib/geo-types';

// Top province bar
function getProvinceBarOption(provinceGMV: { province: string; gmv: number }[]): EChartsOption {
  const sorted = [...provinceGMV].sort((a, b) => b.gmv - a.gmv).slice(0, 12);
  return mergeChartOptions({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(p => p.province),
      inverse: true,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: sorted.map((p, i) => ({
        value: p.gmv,
        itemStyle: {
          color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: chartColors.primary[i % chartColors.primary.length] + '88' }, { offset: 1, color: chartColors.primary[i % chartColors.primary.length] }] },
          borderRadius: [0, 6, 6, 0],
        },
      })),
      barWidth: '55%',
    }],
  });
}

// City x Channel Heatmap
function getHeatmapOption(cityChannelHeatmap: { city: string; channel: string; gmv: number }[]): EChartsOption {
  const cityTotals = cityChannelHeatmap.reduce<Record<string, number>>((acc, row) => {
    acc[row.city] = (acc[row.city] ?? 0) + row.gmv;
    return acc;
  }, {});
  const cities = Object.entries(cityTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([city]) => city);
  const channels = [...new Set(cityChannelHeatmap.map(h => h.channel))];
  const data = cityChannelHeatmap
    .filter(h => cities.includes(h.city))
    .map(h => [channels.indexOf(h.channel), cities.indexOf(h.city), h.gmv]);
  const maxGMV = Math.max(1, ...data.map(h => Number(h[2] ?? 0)));

  return mergeChartOptions({
    tooltip: {
      position: 'top',
      formatter: (params: unknown) => {
        const p = params as { data: number[] };
        return `<strong>${cities[p.data[1]]}</strong> x ${channels[p.data[0]]}<br/>${formatIDR(p.data[2])}`;
      },
    },
    grid: { left: 8, right: 16, top: 8, bottom: 88, containLabel: true },
    xAxis: {
      type: 'category',
      data: channels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, interval: 0 },
      splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
    },
    yAxis: {
      type: 'category',
      data: cities,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, width: 90, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: maxGMV,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
      inRange: { color: ['#0e1726', '#06b6d4', '#6366f1', '#a855f7'] },
      formatter: (value: string | number | Date | null | undefined) => abbreviateIDR(Number(value ?? 0)),
    },
    series: [{
      type: 'heatmap',
      data: data,
      label: {
        show: cities.length <= 8,
        color: '#fff',
        fontSize: 9,
        formatter: (params: unknown) => abbreviateIDR((params as { data: number[] }).data[2]),
      },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  });
}

const retentionColors = {
  oneTime: '#64748b',
  twoTime: '#22c55e',
  threeToFive: '#06b6d4',
  sixPlus: '#f97316',
};

const emptyRetentionAnalytics: CustomerRetentionAnalytics = {
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

function getRetentionFrequencyOption(retention: CustomerRetentionAnalytics): EChartsOption {
  const channels = retention.channels;
  const labels = channels.map((channel) => channel.channel);
  const hasData = channels.length > 0;

  return mergeChartOptions({
    title: hasData
      ? undefined
      : {
          text: 'No customer frequency data in current filter',
          left: 'center',
          top: 'middle',
          textStyle: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 },
        },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const rows = params as Array<{ axisValue: string; seriesName: string; value: number; dataIndex: number }>;
        const channel = channels[rows[0]?.dataIndex ?? 0];
        if (!channel) return '';
        return [
          `<strong>${channel.channel}</strong>`,
          `Unique customers: ${formatNumber(channel.uniqueCustomers)}`,
          `One-time buyers: ${formatNumber(channel.oneTimeCustomers)}`,
          `Repeat buyers: ${formatNumber(channel.repeatCustomers)} (${formatPercent(channel.repeatRate)})`,
          `Avg frequency: ${channel.avgPurchaseFrequency.toFixed(2)}x`,
          `Total orders: ${formatNumber(channel.totalOrders)}`,
          `GMV: ${formatIDR(channel.totalGMV)}`,
        ].join('<br/>');
      },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: 'rgba(255,255,255,0.62)', fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    grid: { left: 12, right: 18, top: 44, bottom: 64, containLabel: true },
    xAxis: {
      type: 'category',
      name: 'Channel Pembelian',
      nameLocation: 'middle',
      nameGap: 42,
      data: labels,
      axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 10, interval: 0, width: 96, overflow: 'break' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'Jumlah Customer',
      minInterval: 1,
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (value: number) => formatNumber(value) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [
      {
        type: 'bar',
        name: '1x',
        stack: 'customers',
        data: channels.map((channel) => channel.oneTimeCustomers),
        itemStyle: { color: retentionColors.oneTime, borderRadius: [0, 0, 4, 4] },
      },
      {
        type: 'bar',
        name: '2x',
        stack: 'customers',
        data: channels.map((channel) => channel.twoTimeCustomers),
        itemStyle: { color: retentionColors.twoTime },
      },
      {
        type: 'bar',
        name: '3-5x',
        stack: 'customers',
        data: channels.map((channel) => channel.threeToFiveCustomers),
        itemStyle: { color: retentionColors.threeToFive },
      },
      {
        type: 'bar',
        name: '6x+',
        stack: 'customers',
        data: channels.map((channel) => channel.sixPlusCustomers),
        itemStyle: { color: retentionColors.sixPlus, borderRadius: [4, 4, 0, 0] },
      },
    ],
  });
}

function getRetentionMonthlyHeatmapOption(retention: CustomerRetentionAnalytics): EChartsOption {
  const months = Array.from(new Map(retention.monthly.map((row) => [row.month, row.monthLabel])).entries())
    .sort((a, b) => a[0].localeCompare(b[0]));
  const channels = retention.channels.map((channel) => channel.channel);
  const maxRate = Math.max(1, ...retention.monthly.map((row) => row.repeatRate));
  const data = retention.monthly.map((row) => [
    months.findIndex(([month]) => month === row.month),
    channels.indexOf(row.channel),
    row.repeatRate,
    row.uniqueCustomers,
    row.repeatCustomers,
    row.oneTimeCustomers,
    row.returningCustomers,
    row.avgPurchaseFrequency,
  ]);

  return mergeChartOptions({
    tooltip: {
      position: 'top',
      formatter: (params: unknown) => {
        const p = params as { data: number[] };
        const row = retention.monthly.find((item) => item.month === months[p.data[0]]?.[0] && item.channel === channels[p.data[1]]);
        if (!row) return '';
        return [
          `<strong>${row.channel} - ${row.monthLabel}</strong>`,
          `Repeat rate: ${formatPercent(row.repeatRate)}`,
          `Unique customers: ${formatNumber(row.uniqueCustomers)}`,
          `One-time buyers: ${formatNumber(row.oneTimeCustomers)}`,
          `Repeat buyers: ${formatNumber(row.repeatCustomers)}`,
          `Returning buyers: ${formatNumber(row.returningCustomers)}`,
          `Avg frequency: ${row.avgPurchaseFrequency.toFixed(2)}x`,
        ].join('<br/>');
      },
    },
    grid: { left: 16, right: 18, top: 12, bottom: 58, containLabel: true },
    xAxis: {
      type: 'category',
      data: months.map(([, label]) => label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 10 },
      splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
    },
    yAxis: {
      type: 'category',
      data: channels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 10, width: 110, overflow: 'truncate' },
    },
    visualMap: {
      min: 0,
      max: maxRate,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
      inRange: { color: ['#111827', '#0f766e', '#06b6d4', '#f97316'] },
      formatter: (value: string | number | Date | null | undefined) => formatPercent(Number(value ?? 0)),
    },
    series: [{
      type: 'heatmap',
      data,
      label: {
        show: true,
        color: '#fff',
        fontSize: 10,
        formatter: (params: unknown) => formatPercent(Number((params as { data: number[] }).data[2] ?? 0)),
      },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.45)' } },
    }],
  });
}

type SortField = 'source' | 'province' | 'city' | 'orders' | 'gmv';
type SortOrder = 'asc' | 'desc';
const LOCATION_ROWS_PER_PAGE = 10;

function SortIcon({ field, sortField, sortOrder }: { field: SortField; sortField: SortField; sortOrder: SortOrder }) {
  if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
  return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 text-primary" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
}

export default function GeoSalesPage() {
  const boundaryMapRef = useRef<MapLibreGeoHeatmapHandle>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('gmv');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [locationPage, setLocationPage] = useState(1);
  const { data, isLoading } = useDashboardData();
  const liveLocations: LocationGMV[] = data?.locations?.length
    ? data.locations.map((location) => ({
        source: location.source,
        channelKey: location.channelKey,
        province: location.province,
        city: location.city,
        district: location.district,
        orders: location.orders,
        gmv: location.gmv,
        activeGMV: location.activeGMV,
        cancellationValue: location.cancellationValue,
        regionalManager: location.regionalManager,
        areaManager: location.areaManager,
      }))
    : [];
  const liveProvinceGMV = Object.values(
    liveLocations.reduce<Record<string, { province: string; gmv: number }>>((acc, location) => {
      const current = acc[location.province] ?? { province: location.province, gmv: 0 };
      current.gmv += location.gmv;
      acc[location.province] = current;
      return acc;
    }, {}),
  );
  const liveCityChannelHeatmap = Object.values(
    liveLocations.reduce<Record<string, { city: string; channel: string; gmv: number }>>((acc, location) => {
      const channel = location.source.replace('B2B ', '');
      const key = `${location.city}|${channel}`;
      const current = acc[key] ?? { city: location.city, channel, gmv: 0 };
      current.gmv += location.gmv;
      acc[key] = current;
      return acc;
    }, {}),
  );
  const totalGeoGMV = liveLocations.reduce((s, l) => s + l.gmv, 0);
  const totalGeoOrders = liveLocations.reduce((s, l) => s + l.orders, 0);
  const topProvince = [...liveProvinceGMV].sort((a, b) => b.gmv - a.gmv)[0];
  const retentionAnalytics = data?.customerRetentionAnalytics ?? emptyRetentionAnalytics;
  const retentionMonthCount = new Set(retentionAnalytics.monthly.map((row) => row.month).filter((month) => month !== 'Unknown')).size;
  const showMonthlyRetention = retentionMonthCount > 1;
  const retentionCustomers = retentionAnalytics.customers.slice(0, 10);
  const liveGeoTransactions = data?.geoTransactions ?? [];

  const handleSort = (field: SortField) => {
    setLocationPage(1);
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredData = liveLocations
    .filter((loc) => 
      loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.source.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      if (typeof a[sortField] === 'string') {
        return modifier * (a[sortField] as string).localeCompare(b[sortField] as string);
      }
      return modifier * ((a[sortField] as number) - (b[sortField] as number));
    });
  const locationTotalPages = Math.max(1, Math.ceil(filteredData.length / LOCATION_ROWS_PER_PAGE));
  const activeLocationPage = Math.min(locationPage, locationTotalPages);
  const locationPageStartIndex = (activeLocationPage - 1) * LOCATION_ROWS_PER_PAGE;
  const paginatedLocationData = filteredData.slice(
    locationPageStartIndex,
    locationPageStartIndex + LOCATION_ROWS_PER_PAGE,
  );
  const locationPageEndIndex = Math.min(locationPageStartIndex + paginatedLocationData.length, filteredData.length);

  return (
    <div className="relative animate-fade-in-up space-y-4 sm:space-y-5 lg:space-y-6">
      {isLoading && (
        <div className="sticky top-20 z-30 flex items-center gap-2 rounded-[8px] border border-primary/25 bg-card/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg shadow-black/20 backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading filtered data...
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
        <KPICard
          label="Total Geo GMV"
          value={abbreviateIDR(totalGeoGMV)}
          change={14.5}
          changeLabel="vs prev month"
          icon={<Globe className="h-5 w-5" />}
        />
        <KPICard
          label="Total Locations"
          value={liveLocations.length.toLocaleString('id-ID')}
          icon={<MapPin className="h-5 w-5" />}
        />
        <KPICard
          label="Top Province"
          value={topProvince?.province ?? 'N/A'}
          change={18.2}
          changeLabel={topProvince ? `${abbreviateIDR(topProvince.gmv)} GMV` : 'No data'}
          icon={<Building className="h-5 w-5" />}
        />
        <KPICard
          label="Total Orders"
          value={totalGeoOrders.toLocaleString('id-ID')}
          change={11.3}
          changeLabel="vs prev month"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <ChartCard
        title="Indonesia GMV Boundary Map"
        contentClassName="p-0"
        onDownload={() => {
          void boundaryMapRef.current?.downloadPNG();
        }}
      >
        <MapLibreGeoHeatmap
          ref={boundaryMapRef}
          locations={liveLocations}
          transactions={liveGeoTransactions}
          className="h-[560px] min-h-[560px] rounded-none border-0 sm:h-[620px] sm:min-h-[620px] lg:h-[680px] lg:min-h-[680px] xl:h-[720px] xl:min-h-[720px]"
        />
      </ChartCard>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartCard title="Top Province by GMV" subtitle="Top 12 provinces, all channels combined">
          <EChart option={getProvinceBarOption(liveProvinceGMV)} style={{ height: 320, minHeight: 280 }} />
        </ChartCard>
        <ChartCard title="City vs Channel Heatmap" subtitle="Top city contribution across GT, MT, and marketplace">
          <EChart option={getHeatmapOption(liveCityChannelHeatmap)} style={{ height: 320, minHeight: 280 }} />
        </ChartCard>
      </div>

      <ChartCard title="Customer Retention & Frequency" subtitle="One-time vs repeat buyers by channel and month">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="min-w-0 border-l border-primary/50 bg-muted/15 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Unique Customers</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(retentionAnalytics.summary.uniqueCustomers)}</p>
            </div>
            <div className="min-w-0 border-l border-slate-400/60 bg-muted/15 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">One-time Buyers</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(retentionAnalytics.summary.oneTimeCustomers)}</p>
            </div>
            <div className="min-w-0 border-l border-emerald-400/60 bg-muted/15 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Repeat Buyers</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(retentionAnalytics.summary.repeatCustomers)}</p>
            </div>
            <div className="min-w-0 border-l border-cyan-400/60 bg-muted/15 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Repeat Rate</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatPercent(retentionAnalytics.summary.repeatRate)}</p>
            </div>
            <div className="min-w-0 border-l border-orange-400/60 bg-muted/15 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Frequency</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{retentionAnalytics.summary.avgPurchaseFrequency.toFixed(2)}x</p>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">Purchase Frequency by Channel</p>
                <p className="text-[11px] text-muted-foreground">1x, 2x, 3-5x, and 6x+ buyers</p>
              </div>
              <EChart option={getRetentionFrequencyOption(retentionAnalytics)} style={{ height: 360, minHeight: 320 }} />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">
                  {showMonthlyRetention ? 'Monthly Repeat Rate' : 'Channel Retention Snapshot'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {showMonthlyRetention ? `${retentionMonthCount} months selected` : 'Current selected period'}
                </p>
              </div>
              {showMonthlyRetention ? (
                <EChart option={getRetentionMonthlyHeatmapOption(retentionAnalytics)} style={{ height: 360, minHeight: 320 }} />
              ) : (
                <div className="overflow-hidden border-y border-border/80">
                  {retentionAnalytics.channels.map((channel) => (
                    <div key={channel.channelKey} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/60 py-3 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{channel.channel}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatNumber(channel.oneTimeCustomers)} one-time / {formatNumber(channel.repeatCustomers)} repeat
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatPercent(channel.repeatRate)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{channel.avgPurchaseFrequency.toFixed(2)}x avg</p>
                      </div>
                    </div>
                  ))}
                  {retentionAnalytics.channels.length === 0 && (
                    <div className="py-10 text-center text-xs text-muted-foreground">No retention data in current filter</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border-t border-border pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">Customer Drilldown</p>
              <p className="text-[11px] text-muted-foreground">Top 10 by purchase frequency</p>
            </div>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Channel</th>
                  <th className="pb-3 pr-4">Segment</th>
                  <th className="pb-3 pr-4 text-right">Purchases</th>
                  <th className="pb-3 pr-4 text-right">Active Months</th>
                  <th className="pb-3 text-right">GMV</th>
                </tr>
              </thead>
              <tbody>
                {retentionCustomers.map((customer) => (
                  <tr key={`${customer.channelKey}-${customer.customer}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="py-3 pr-4 font-medium text-foreground">{customer.customer}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{customer.channel}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex rounded-md bg-muted/40 px-2 py-1 text-xs font-medium text-foreground">
                        {customer.segment}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-foreground">{customer.purchaseCount.toLocaleString('id-ID')}x</td>
                    <td className="py-3 pr-4 text-right text-foreground">{customer.activeMonths.toLocaleString('id-ID')}</td>
                    <td className="py-3 text-right font-semibold text-foreground">{abbreviateIDR(customer.totalGMV)}</td>
                  </tr>
                ))}
                {retentionCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No customers found in current filter</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ChartCard>

      <ChartCard 
        title="Location Detail Table" 
        subtitle="Drilldown top locations by GMV across all channels"
        action={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setLocationPage(1);
              }}
              className="h-8 w-full rounded-md border border-border bg-muted/30 pl-8 pr-3 text-xs text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        }
      >
        <div className="md:hidden">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredData.length.toLocaleString('id-ID')} locations</span>
            <span>Sorted by {sortField.toUpperCase()}</span>
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(['gmv', 'orders', 'city'] as SortField[]).map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => handleSort(field)}
                className={`flex h-8 items-center justify-center rounded-[8px] border px-2 text-xs font-medium transition ${
                  sortField === field
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                {field.toUpperCase()}
                <SortIcon field={field} sortField={sortField} sortOrder={sortOrder} />
              </button>
            ))}
          </div>
          <div className="divide-y divide-border/70 rounded-[8px] border border-border/80">
            {paginatedLocationData.map((loc, i) => {
              const rowNumber = locationPageStartIndex + i + 1;

              return (
              <div key={`${loc.source}-${loc.city}-mobile-${rowNumber}`} className="grid gap-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{loc.city}</p>
                    <p className="truncate text-xs text-muted-foreground">{loc.province}</p>
                  </div>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                    #{rowNumber}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Source</p>
                    <p className="truncate font-medium text-foreground">{loc.source}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Orders</p>
                    <p className="font-medium text-foreground">{loc.orders.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">GMV</p>
                    <p className="font-semibold text-foreground">{abbreviateIDR(loc.gmv)}</p>
                  </div>
                </div>
              </div>
              );
            })}
            {filteredData.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No locations found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="cursor-pointer pb-3 pr-4 hover:text-foreground transition-colors" onClick={() => handleSort('source')}>
                  <div className="flex items-center">Source <SortIcon field="source" sortField={sortField} sortOrder={sortOrder} /></div>
                </th>
                <th className="cursor-pointer pb-3 pr-4 hover:text-foreground transition-colors" onClick={() => handleSort('province')}>
                  <div className="flex items-center">Province <SortIcon field="province" sortField={sortField} sortOrder={sortOrder} /></div>
                </th>
                <th className="cursor-pointer pb-3 pr-4 hover:text-foreground transition-colors" onClick={() => handleSort('city')}>
                  <div className="flex items-center">City <SortIcon field="city" sortField={sortField} sortOrder={sortOrder} /></div>
                </th>
                <th className="cursor-pointer pb-3 pr-4 text-right hover:text-foreground transition-colors" onClick={() => handleSort('orders')}>
                  <div className="flex items-center justify-end">Orders <SortIcon field="orders" sortField={sortField} sortOrder={sortOrder} /></div>
                </th>
                <th className="cursor-pointer pb-3 text-right hover:text-foreground transition-colors" onClick={() => handleSort('gmv')}>
                  <div className="flex items-center justify-end">GMV <SortIcon field="gmv" sortField={sortField} sortOrder={sortOrder} /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLocationData.map((loc, i) => {
                const rowNumber = locationPageStartIndex + i + 1;

                return (
                <tr key={`${loc.source}-${loc.city}-${rowNumber}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${rowNumber <= 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>{rowNumber}</span></td>
                  <td className="py-3 pr-4 text-muted-foreground text-xs">{loc.source}</td>
                  <td className="py-3 pr-4 font-medium text-foreground">{loc.province}</td>
                  <td className="py-3 pr-4 text-foreground">{loc.city}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{loc.orders.toLocaleString('id-ID')}</td>
                  <td className="py-3 text-right font-semibold text-foreground">{formatIDR(loc.gmv)}</td>
                </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">No locations found matching &quot;{searchQuery}&quot;</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredData.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {locationPageStartIndex + 1}-{locationPageEndIndex} of {filteredData.length.toLocaleString('id-ID')} locations
            </span>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setLocationPage((page) => Math.max(1, page - 1))}
                disabled={activeLocationPage === 1}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-muted/20 px-3 font-medium text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="min-w-24 text-center font-medium text-foreground">
                Page {activeLocationPage} / {locationTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setLocationPage((page) => Math.min(locationTotalPages, page + 1))}
                disabled={activeLocationPage === locationTotalPages}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-muted/20 px-3 font-medium text-foreground transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
