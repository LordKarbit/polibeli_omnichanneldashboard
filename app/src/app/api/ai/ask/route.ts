import { aiQueryLogs } from "@/server/db/schema";
import { db } from "@/server/db";
import { badRequest, ok, readJson, serverError } from "@/server/api/http";
import { getDashboardData } from "@/server/analytics/dashboard-data";
import { answerDashboardQuestion } from "@/server/ai/dashboard-assistant";
import { sha256 } from "@/server/ingestion/hash";
import {
  constrainDashboardDataForRole,
  requireApiPermission,
  scopedDashboardSearchParams,
} from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AskBody extends Record<string, unknown> {
  question?: string;
  filters?: Record<string, string>;
}

function buildSearchParams(filters?: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return searchParams;
}

export async function POST(request: Request) {
  const body = await readJson<AskBody>(request);
  const question = body?.question?.trim();

  if (!question) {
    return badRequest("question is required");
  }

  const started = Date.now();

  try {
    const access = await requireApiPermission("viewAi", request);
    if (access instanceof Response) return access;

    const data = constrainDashboardDataForRole(
      await getDashboardData(scopedDashboardSearchParams(buildSearchParams(body?.filters), access.role)),
      access.role,
    );
    const result = await answerDashboardQuestion(question, data, body?.filters);

    await db.insert(aiQueryLogs).values({
      userId: access.session.user.id,
      question,
      generatedSql: result.generatedSql,
      safeSqlHash: sha256(result.generatedSql),
      filterContext: body?.filters ?? null,
      answerSummary: result.llmError ? `${result.answer}\n\nLLM fallback: ${result.llmError}` : result.answer,
      chartSuggestion: {
        ...(result.chartSuggestion ?? {}),
        assistantMode: result.assistantMode,
        llmProvider: result.llmProvider,
        llmModel: result.llmModel,
        llmError: result.llmError,
      },
      resultRowCount: result.table?.rows.length ?? 0,
      latencyMs: Date.now() - started,
      status: result.assistantMode === "llm_api" ? "answered_llm" : result.llmError ? "answered_local_llm_fallback" : "answered_local",
    });

    return ok({
      answer: result.answer,
      generatedSql: result.generatedSql,
      table: result.table,
      chartSuggestion: result.chartSuggestion,
      downloadUrl: result.downloadUrl,
      assistantMode: result.assistantMode,
      llmProvider: result.llmProvider,
      llmModel: result.llmModel,
      llmError: result.llmError,
      filterContext: body?.filters ?? {},
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    await db.insert(aiQueryLogs).values({
      question,
      generatedSql: null,
      safeSqlHash: null,
      filterContext: body?.filters ?? null,
      answerSummary: null,
      resultRowCount: 0,
      latencyMs: Date.now() - started,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown AI query error",
    });
    return serverError(error);
  }
}
