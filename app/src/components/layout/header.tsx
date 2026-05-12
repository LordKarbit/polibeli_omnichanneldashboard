'use client';

import { usePathname } from 'next/navigation';
import { Bell, Calendar, Filter, LogOut, Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from './theme-toggle';
import { useEffect, useMemo, useState } from 'react';
import { signOut } from '@/lib/auth-client';
import { useDashboardAccess } from './dashboard-access-provider';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Executive Overview', subtitle: 'Omnichannel sales performance at a glance' },
  '/gt': { title: 'GT Performance', subtitle: 'General Trade - sales, area manager, and customer retention analytics' },
  '/mt': { title: 'MT / Agency', subtitle: 'Modern Trade — bulk order & agency performance' },
  '/marketplace': { title: 'Marketplace', subtitle: 'Sales performance, lifecycle, SKU demand, and settlement control center' },
  '/income': { title: 'Income & Settlement', subtitle: 'Released amount, fee leakage, payout, and marketplace income reporting' },
  '/sku': { title: 'SKU & Product', subtitle: 'Product performance across all channels' },
  '/geo': { title: 'Geo Sales', subtitle: 'Geographic distribution — province & city performance' },
  '/operations': { title: 'Operations & Fulfillment', subtitle: 'Order status, shipping, cancellation & refund monitoring' },
  '/customers': { title: 'Customer / Buyer Analytics', subtitle: 'Customer contribution, RFM, repeat buyer analysis' },
  '/upload': { title: 'Upload Center', subtitle: 'Upload and manage raw data files' },
  '/data-quality': { title: 'Data Quality', subtitle: 'Validation, issues, and data health' },
  '/ai': { title: 'AI Insight Center', subtitle: 'Ask anything about your sales data' },
  '/users': { title: 'Users & Roles', subtitle: 'Account provisioning, role access, and permission governance' },
};

export function Header() {
  const pathname = usePathname();
  const { user, roleLabel, allowedChannels } = useDashboardAccess();
  const page = pageTitles[pathname] ?? { title: 'Dashboard', subtitle: '' };
  const [searchKey, setSearchKey] = useState('');

  useEffect(() => {
    const syncSearch = (event?: Event) => {
      const query =
        event instanceof CustomEvent && typeof event.detail?.query === 'string'
          ? event.detail.query
          : window.location.search.slice(1);
      setSearchKey(query);
    };

    syncSearch();
    window.addEventListener('popstate', syncSearch);
    window.addEventListener('dashboard-filter-change', syncSearch);
    return () => {
      window.removeEventListener('popstate', syncSearch);
      window.removeEventListener('dashboard-filter-change', syncSearch);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchKey(window.location.search.slice(1)), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchKey);
    let count = 0;
    const channels = params.get('channels');
    if (channels) {
      const selectedChannelCount = channels.split(',').filter(Boolean).length;
      const defaultChannelCount = pathname === '/marketplace' ? Math.min(allowedChannels.length, 3) : allowedChannels.length;
      if (selectedChannelCount > 0 && selectedChannelCount < defaultChannelCount) count += 1;
    }
    if (params.get('excludeCancelled') === 'true') count += 1;
    if (params.get('metric') && params.get('metric') !== 'Active GMV') count += 1;
    if (params.get('status') && !['All', 'all'].includes(params.get('status') ?? '')) count += 1;
    if (params.get('start')) count += 1;
    if (params.get('end')) count += 1;
    if (params.get('regionalManager') && !['All', 'all'].includes(params.get('regionalManager') ?? '')) count += 1;
    if (params.get('areaManager') && !['All', 'all'].includes(params.get('areaManager') ?? '')) count += 1;
    if (params.get('province') && !['All', 'all'].includes(params.get('province') ?? '')) count += 1;
    if (params.get('city') && !['All', 'all'].includes(params.get('city') ?? '')) count += 1;
    if (params.get('skuType') && !['All', 'all'].includes(params.get('skuType') ?? '')) count += 1;
    return count;
  }, [allowedChannels.length, pathname, searchKey]);

  function openFilters() {
    window.dispatchEvent(new CustomEvent('dashboard-filter-panel-open'));
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 shadow-sm shadow-black/5 backdrop-blur-md sm:px-6">
      {/* Left: Page title */}
      <div className="min-w-0 flex-1 pl-14 lg:pl-0">
        <h1 className="truncate text-base font-semibold text-foreground">{page.title}</h1>
        <p className="truncate text-xs text-muted-foreground">{page.subtitle}</p>
      </div>

      {/* Right: Controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={openFilters}
          className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-border bg-card/80 px-2.5 text-xs font-semibold text-foreground shadow-sm shadow-black/5 transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : (
            <Filter className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          )}
        </button>

        <ThemeToggle />

        {/* Period badge */}
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 md:flex">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Apr 2026</span>
        </div>

        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="h-8 w-48 bg-muted/50 pl-8 text-xs"
          />
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive p-0 text-[9px] text-white">
            3
          </Badge>
        </button>

        {/* Avatar */}
        <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-border bg-card/70 px-2 py-1.5 xl:flex">
          <Avatar className="h-7 w-7 border border-border">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {user.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="max-w-32 truncate text-xs font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login'; } } })}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
