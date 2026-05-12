import { ok, serverError } from "@/server/api/http";
import { resetDashboardData } from "@/server/ingestion/dashboard-ingestion";
import { requireApiPermission } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const access = await requireApiPermission("wipeData", request);
    if (access instanceof Response) return access;

    await resetDashboardData();
    return ok({ wiped: true, message: "All dashboard data has been wiped." });
  } catch (error) {
    return serverError(error);
  }
}
