import { desc, eq } from "drizzle-orm";

import { badRequest, created, getLimit, getOptionalSession, ok, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { aiQueryLogs } from "@/server/db/schema";
import { sha256 } from "@/server/ingestion/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = getLimit(searchParams, 100, 500);
  const batchId = searchParams.get("batchId");

  try {
    const baseQuery = db
      .select()
      .from(aiQueryLogs)
      .orderBy(desc(aiQueryLogs.createdAt))
      .limit(limit);

    const logs = batchId ? await baseQuery.where(eq(aiQueryLogs.batchId, batchId)) : await baseQuery;
    return ok({ logs });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const body = await readJson<{
    batchId?: string;
    question?: string;
    generatedSql?: string;
    filterContext?: Record<string, unknown>;
    answerSummary?: string;
    chartSuggestion?: Record<string, unknown>;
    resultRowCount?: number;
    latencyMs?: number;
    status?: string;
    errorMessage?: string;
  }>(request);

  if (!body?.question) {
    return badRequest("question is required");
  }

  try {
    const session = await getOptionalSession();
    const [log] = await db
      .insert(aiQueryLogs)
      .values({
        userId: session?.user?.id,
        batchId: body.batchId,
        question: body.question,
        generatedSql: body.generatedSql,
        safeSqlHash: body.generatedSql ? sha256(body.generatedSql) : undefined,
        filterContext: body.filterContext ?? null,
        answerSummary: body.answerSummary,
        chartSuggestion: body.chartSuggestion ?? null,
        resultRowCount: body.resultRowCount ?? 0,
        latencyMs: body.latencyMs ?? 0,
        status: body.status ?? "logged",
        errorMessage: body.errorMessage,
      })
      .returning();

    return created({ log });
  } catch (error) {
    return serverError(error);
  }
}
