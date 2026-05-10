import { desc } from "drizzle-orm";

import { badRequest, created, getLimit, getOptionalSession, ok, parseDate, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { uploadBatches } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = getLimit(searchParams, 50, 200);

  try {
    const batches = await db
      .select()
      .from(uploadBatches)
      .orderBy(desc(uploadBatches.createdAt))
      .limit(limit);

    return ok({ batches });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const body = await readJson<{
    uploadContext?: string;
    periodStart?: string;
    periodEnd?: string;
    notes?: string;
  }>(request);

  if (!body) {
    return badRequest("Expected a JSON payload");
  }

  try {
    const session = await getOptionalSession();
    const [batch] = await db
      .insert(uploadBatches)
      .values({
        uploadedByUserId: session?.user?.id,
        uploadContext: body.uploadContext ?? "omnichannel_dashboard",
        periodStart: parseDate(body.periodStart),
        periodEnd: parseDate(body.periodEnd),
        notes: body.notes,
      })
      .returning();

    return created({ batch });
  } catch (error) {
    return serverError(error);
  }
}
