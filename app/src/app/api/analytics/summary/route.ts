import { getDashboardData } from "@/server/analytics/dashboard-data";
import { ok, serverError } from "@/server/api/http";
import {
  constrainDashboardDataForRole,
  requireApiSession,
  scopedDashboardSearchParams,
} from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requireApiSession();
    if (access instanceof Response) return access;

    const { searchParams } = new URL(request.url);
    const data = await getDashboardData(scopedDashboardSearchParams(searchParams, access.role));
    return ok(constrainDashboardDataForRole(data, access.role));
  } catch (error) {
    return serverError(error);
  }
}
