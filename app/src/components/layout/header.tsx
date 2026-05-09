'use client';

import { usePathname } from 'next/navigation';
import { Bell, Calendar, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Executive Overview', subtitle: 'Omnichannel sales performance at a glance' },
  '/gt': { title: 'GT Performance', subtitle: 'General Trade — Regional & Area Manager analytics' },
  '/mt': { title: 'MT / Agency', subtitle: 'Modern Trade — bulk order & agency performance' },
  '/marketplace': { title: 'Marketplace', subtitle: 'Shopee, TikTok Shop (Kayou ID) & (Kayou Card ID) comparison' },
  '/sku': { title: 'SKU & Product', subtitle: 'Product performance across all channels' },
  '/geo': { title: 'Geo Sales', subtitle: 'Geographic distribution — province & city performance' },
  '/operations': { title: 'Operations & Fulfillment', subtitle: 'Order status, shipping, cancellation & refund monitoring' },
  '/customers': { title: 'Customer / Buyer Analytics', subtitle: 'Customer contribution, RFM, repeat buyer analysis' },
  '/upload': { title: 'Upload Center', subtitle: 'Upload and manage raw data files' },
  '/data-quality': { title: 'Data Quality', subtitle: 'Validation, issues, and data health' },
  '/ai': { title: 'AI Insight Center', subtitle: 'Ask anything about your sales data' },
};

export function Header() {
  const pathname = usePathname();
  const page = pageTitles[pathname] ?? { title: 'Dashboard', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      {/* Left: Page title */}
      <div className="flex flex-col">
        <h1 className="text-base font-semibold text-foreground">{page.title}</h1>
        <p className="text-xs text-muted-foreground">{page.subtitle}</p>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-4">
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
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            SA
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
