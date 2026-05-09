'use client';

import { useState } from 'react';
import { KPICard } from '@/components/ui/kpi-card';
import { ChartCard } from '@/components/ui/chart-card';
import { EChart } from '@/components/charts/echart';
import { locationData, provinceGMV, cityChannelHeatmap } from '@/data/mock/extended';
import { mergeChartOptions } from '@/lib/chart-config';
import { chartColors } from '@/lib/theme';
import { formatIDR, abbreviateIDR } from '@/lib/format';
import { MapPin, Building, Globe, TrendingUp, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { EChartsOption } from 'echarts';

const totalGeoGMV = locationData.reduce((s, l) => s + l.gmv, 0);
const totalGeoOrders = locationData.reduce((s, l) => s + l.orders, 0);

// Top province bar
function getProvinceBarOption(): EChartsOption {
  const sorted = [...provinceGMV].sort((a, b) => b.gmv - a.gmv);
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

// City × Channel Heatmap
function getHeatmapOption(): EChartsOption {
  const cities = [...new Set(cityChannelHeatmap.map(h => h.city))];
  const channels = [...new Set(cityChannelHeatmap.map(h => h.channel))];
  const data = cityChannelHeatmap.map(h => [channels.indexOf(h.channel), cities.indexOf(h.city), h.gmv]);
  const maxGMV = Math.max(...cityChannelHeatmap.map(h => h.gmv));

  return mergeChartOptions({
    tooltip: {
      position: 'top',
      formatter: (params: unknown) => {
        const p = params as { data: number[] };
        return `<strong>${cities[p.data[1]]}</strong> × ${channels[p.data[0]]}<br/>${formatIDR(p.data[2])}`;
      },
    },
    grid: { left: 12, right: 24, top: 8, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: channels,
      axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
    },
    yAxis: {
      type: 'category',
      data: cities,
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

// Geo bubble (scatter) — GMV vs Orders by city
function getGeoBubbleOption(): EChartsOption {
  const gtLocations = locationData.filter(l => !l.source.includes('Agency'));
  return mergeChartOptions({
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number, string] };
        return `<strong>${p.data[3]}</strong><br/>GMV: ${formatIDR(p.data[0])}<br/>Orders: ${p.data[1]}`;
      },
    },
    grid: { left: 12, right: 24, top: 16, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'GMV',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, formatter: (v: number) => abbreviateIDR(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'value',
      name: 'Orders',
      axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: [{
      type: 'scatter',
      symbolSize: (data: number[]) => Math.max(Math.sqrt(data[2]) * 4, 15),
      data: gtLocations.map(l => [l.gmv, l.orders, l.gmv / 1000000, `${l.city} (${l.source})`]),
      itemStyle: {
        color: ((params: { dataIndex: number }) => chartColors.primary[params.dataIndex % chartColors.primary.length]) as unknown as string,
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.25)',
      },
    }],
  });
}

type SortField = 'source' | 'province' | 'city' | 'orders' | 'gmv';
type SortOrder = 'asc' | 'desc';

export default function GeoSalesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('gmv');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredData = locationData
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 text-primary" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Total Geo GMV" value={abbreviateIDR(totalGeoGMV)} change={14.5} changeLabel="vs prev month" icon={<Globe className="h-5 w-5" />} />
        <KPICard label="Total Locations" value={locationData.length.toString()} icon={<MapPin className="h-5 w-5" />} />
        <KPICard label="Top Province" value="DKI Jakarta" change={18.2} changeLabel="contribution" icon={<Building className="h-5 w-5" />} />
        <KPICard label="Total Orders" value={totalGeoOrders.toLocaleString('id-ID')} change={11.3} changeLabel="vs prev month" icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top Province by GMV" subtitle="All channels combined">
          <EChart option={getProvinceBarOption()} style={{ height: 320 }} />
        </ChartCard>
        <ChartCard title="City vs Channel Heatmap" subtitle="GMV intensity by city and channel">
          <EChart option={getHeatmapOption()} style={{ height: 320 }} />
        </ChartCard>
      </div>

      <ChartCard title="Geo Bubble — GMV vs Orders" subtitle="Bubble size = GMV magnitude">
        <EChart option={getGeoBubbleOption()} style={{ height: 360 }} />
      </ChartCard>

      <ChartCard 
        title="Location Detail Table" 
        subtitle="Drilldown top locations by GMV across all channels"
        action={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-md border border-border bg-muted/30 pl-8 pr-3 text-xs text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">#</th>
                <th className="cursor-pointer pb-3 pr-4 hover:text-foreground transition-colors" onClick={() => handleSort('source')}>
                  <div className="flex items-center">Source <SortIcon field="source" /></div>
                </th>
                <th className="cursor-pointer pb-3 pr-4 hover:text-foreground transition-colors" onClick={() => handleSort('province')}>
                  <div className="flex items-center">Province <SortIcon field="province" /></div>
                </th>
                <th className="cursor-pointer pb-3 pr-4 hover:text-foreground transition-colors" onClick={() => handleSort('city')}>
                  <div className="flex items-center">City <SortIcon field="city" /></div>
                </th>
                <th className="cursor-pointer pb-3 pr-4 text-right hover:text-foreground transition-colors" onClick={() => handleSort('orders')}>
                  <div className="flex items-center justify-end">Orders <SortIcon field="orders" /></div>
                </th>
                <th className="cursor-pointer pb-3 text-right hover:text-foreground transition-colors" onClick={() => handleSort('gmv')}>
                  <div className="flex items-center justify-end">GMV <SortIcon field="gmv" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((loc, i) => (
                <tr key={`${loc.source}-${loc.city}-${i}`} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>{i + 1}</span></td>
                  <td className="py-3 pr-4 text-muted-foreground text-xs">{loc.source}</td>
                  <td className="py-3 pr-4 font-medium text-foreground">{loc.province}</td>
                  <td className="py-3 pr-4 text-foreground">{loc.city}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{loc.orders}</td>
                  <td className="py-3 text-right font-semibold text-foreground">{formatIDR(loc.gmv)}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">No locations found matching "{searchQuery}"</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
