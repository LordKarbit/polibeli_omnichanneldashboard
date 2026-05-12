import GTPerformanceClient from './gt-client';
import { getDashboardData } from '@/server/analytics/dashboard-data';
import type { DashboardData } from '@/lib/dashboard-client';
import { constrainDashboardDataForRole, requireDashboardSession, scopedDashboardSearchParams } from '@/server/security';

export const dynamic = 'force-dynamic';

type SearchParamsValue = string | string[] | undefined;

function toURLSearchParams(searchParams: Record<string, SearchParamsValue>) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    if (typeof value === 'string') params.set(key, value);
  });

  return params;
}

export default async function GTPerformancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamsValue>>;
}) {
  const { role } = await requireDashboardSession();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const dashboardData = await getDashboardData(scopedDashboardSearchParams(toURLSearchParams(resolvedSearchParams), role));
  const initialData = JSON.parse(JSON.stringify(constrainDashboardDataForRole(dashboardData, role))) as DashboardData;

  return <GTPerformanceClient initialData={initialData} />;
}
