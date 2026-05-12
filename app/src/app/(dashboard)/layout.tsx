import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { RouteLoadingOverlay } from '@/components/layout/route-loading-overlay';
import { GlobalFilterPanel } from '@/components/ui/global-filter-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DashboardAccessBoundary, DashboardAccessProvider } from '@/components/layout/dashboard-access-provider';
import { requireDashboardSession } from '@/server/security';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, role, permissions } = await requireDashboardSession();

  return (
    <TooltipProvider>
      <DashboardAccessProvider
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role,
        }}
        permissions={permissions}
      >
        <div className="flex h-screen overflow-hidden bg-transparent">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col pl-0 transition-[padding] duration-300 lg:pl-[var(--dashboard-sidebar-width)]">
            <Header />
            <main className="min-w-0 flex-1 overflow-y-auto">
              <div className="mx-auto min-w-0 max-w-[1600px] p-4 pt-16 sm:p-6 sm:pt-6 lg:pt-6">
                <DashboardAccessBoundary>
                  <GlobalFilterPanel />
                  {children}
                </DashboardAccessBoundary>
              </div>
            </main>
          </div>
          <RouteLoadingOverlay />
        </div>
      </DashboardAccessProvider>
    </TooltipProvider>
  );
}
