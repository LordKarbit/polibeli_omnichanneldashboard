import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { RouteLoadingOverlay } from '@/components/layout/route-loading-overlay';
import { GlobalFilterPanel } from '@/components/ui/global-filter-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Suspense } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col pl-0 transition-[padding] duration-300 lg:pl-[var(--dashboard-sidebar-width)]">
          <Header />
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto min-w-0 max-w-[1600px] p-4 pt-16 sm:p-6 sm:pt-6 lg:pt-6">
              <Suspense fallback={<div className="mb-4 h-12 rounded-xl border border-border bg-card" />}>
                <GlobalFilterPanel />
                {children}
              </Suspense>
            </div>
          </main>
        </div>
        <RouteLoadingOverlay />
      </div>
    </TooltipProvider>
  );
}
