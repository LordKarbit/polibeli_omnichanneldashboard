import { getDashboardData } from "@/server/analytics/dashboard-data";
import { ok, serverError } from "@/server/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getDashboardData(searchParams);
    return ok(data);
  } catch (error) {
    return serverError(error);
  }
}
