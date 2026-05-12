import { ok, serverError } from "@/server/api/http";
import { getIncomeDashboardData } from "@/server/analytics/income-dashboard";
import { requireApiPermission } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await requireApiPermission("viewIncome");
    if (access instanceof Response) return access;

    const data = await getIncomeDashboardData();
    return ok(data);
  } catch (error) {
    return serverError(error);
  }
}
