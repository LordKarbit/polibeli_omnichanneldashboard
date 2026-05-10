import { created, serverError } from "@/server/api/http";
import { getDashboardData } from "@/server/analytics/dashboard-data";
import { loadSampleFiles, processDashboardFiles } from "@/server/ingestion/dashboard-ingestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const replace = searchParams.get("replace") !== "false";
    const files = await loadSampleFiles();
    const ingestion = await processDashboardFiles(files, {
      replace,
      persistFiles: false,
      notes: "QA sample file ingestion from attached PRD examples",
    });
    const analytics = await getDashboardData();

    return created({ ingestion, analytics });
  } catch (error) {
    return serverError(error);
  }
}
