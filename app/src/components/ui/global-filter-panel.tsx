'use client';

import { useState } from 'react';
import { Calendar, Filter, ToggleLeft, ToggleRight, ChevronDown, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { channelNames } from '@/lib/theme';

const channels = Object.entries(channelNames).map(([key, name]) => ({ key, name }));
const metrics = ['Booked GMV', 'Active GMV', 'Paid Amount', 'Quantity', 'Orders', 'AOV'];
const statuses = ['All', 'Completed', 'Shipped', 'Cancelled', 'Pending'];
const regionalManagers = ['All', 'Nur Setyo Aji', 'Hakim Abdul Aziz'];
const areaManagers = ['All', 'Riky Marojahan Hasibuan', 'Wahyu Kusuma Nugroho', 'Nur Setyo Aji', 'Pungguh Ikhsan Priyombodo', 'Lamsihar Sitorus', 'Muliyawarman Muchtar', 'Yoppi Dwi Ariesanto'];
const provinces = ['All', 'DKI Jakarta', 'Jawa Timur', 'Jawa Barat', 'Jawa Tengah', 'Bali', 'Sumatera Utara', 'Sulawesi Selatan', 'Kalimantan Timur'];
const skuIPs = ['All', 'MLBB', 'Naruto', 'My Little Pony', 'Free Fire'];

interface FilterState {
  dateRange: string;
  selectedChannels: string[];
  excludeCancelled: boolean;
  metric: string;
  status: string;
  regionalManager: string;
  areaManager: string;
  province: string;
  skuIP: string;
}

export function GlobalFilterPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: '2026-04-01 — 2026-04-30',
    selectedChannels: channels.map(c => c.key),
    excludeCancelled: false,
    metric: 'Active GMV',
    status: 'All',
    regionalManager: 'All',
    areaManager: 'All',
    province: 'All',
    skuIP: 'All',
  });

  const activeCount = (filters.selectedChannels.length < channels.length ? 1 : 0)
    + (filters.excludeCancelled ? 1 : 0)
    + (filters.metric !== 'Active GMV' ? 1 : 0)
    + (filters.status !== 'All' ? 1 : 0)
    + (filters.regionalManager !== 'All' ? 1 : 0)
    + (filters.areaManager !== 'All' ? 1 : 0)
    + (filters.province !== 'All' ? 1 : 0)
    + (filters.skuIP !== 'All' ? 1 : 0);

  return (
    <div className="mb-4 rounded-xl border border-border bg-card">
      {/* Collapsed bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Filters</span>
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {filters.dateRange} · {filters.metric} · {filters.selectedChannels.length === channels.length ? 'All channels' : `${filters.selectedChannels.length} channels`}
          </span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-4">
          {/* Row 1: Date, Metric, Status, Cancel toggle */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Date Range */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date Range</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{filters.dateRange}</span>
              </div>
            </div>

            {/* Metric Toggle */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Metric</label>
              <select
                value={filters.metric}
                onChange={e => setFilters(f => ({ ...f, metric: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {metrics.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Order Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Cancelled toggle */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cancelled Orders</label>
              <button
                onClick={() => setFilters(f => ({ ...f, excludeCancelled: !f.excludeCancelled }))}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {filters.excludeCancelled ? (
                  <ToggleRight className="h-5 w-5 text-primary" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                )}
                <span>{filters.excludeCancelled ? 'Excluded' : 'Included'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Regional Manager, Area Manager, Province, SKU/IP */}
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Regional Manager</label>
              <select
                value={filters.regionalManager}
                onChange={e => setFilters(f => ({ ...f, regionalManager: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {regionalManagers.map(rm => <option key={rm} value={rm}>{rm}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Area Manager</label>
              <select
                value={filters.areaManager}
                onChange={e => setFilters(f => ({ ...f, areaManager: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {areaManagers.map(am => <option key={am} value={am}>{am}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Province</label>
              <select
                value={filters.province}
                onChange={e => setFilters(f => ({ ...f, province: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SKU / IP</label>
              <select
                value={filters.skuIP}
                onChange={e => setFilters(f => ({ ...f, skuIP: e.target.value }))}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                {skuIPs.map(ip => <option key={ip} value={ip}>{ip}</option>)}
              </select>
            </div>
          </div>

          {/* Channel chips */}
          <div className="mt-4">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</label>
            <div className="flex flex-wrap gap-2">
              {channels.map(ch => {
                const isSelected = filters.selectedChannels.includes(ch.key);
                return (
                  <button
                    key={ch.key}
                    onClick={() => {
                      setFilters(f => ({
                        ...f,
                        selectedChannels: isSelected
                          ? f.selectedChannels.filter(k => k !== ch.key)
                          : [...f.selectedChannels, ch.key],
                      }));
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      isSelected
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-border'
                    )}
                  >
                    {ch.name}
                    {isSelected && <X className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export buttons */}
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Export:</span>
            <button className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground">
              <Download className="h-3 w-3" /> CSV
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground">
              <Download className="h-3 w-3" /> XLSX
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground">
              <Download className="h-3 w-3" /> PDF Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
