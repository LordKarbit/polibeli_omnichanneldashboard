import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { GlobalFilterPanel } from '@/components/ui/global-filter-panel';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col pl-0 transition-all duration-300 lg:pl-[240px]">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1600px] p-4 pt-16 sm:p-6 sm:pt-6 lg:pt-6">
              <GlobalFilterPanel />
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
