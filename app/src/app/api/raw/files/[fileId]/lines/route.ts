import { eq, sql } from "drizzle-orm";

import { badRequest, created, getLimit, notFound, ok, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { rawOrderLines, rawUploadedFiles, uploadBatches } from "@/server/db/schema";
import { rowHash } from "@/server/ingestion/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawLineInput = {
  rowNumber?: number;
  rawPayload: Record<string, unknown>;
  sourceOrderId?: string;
  sourceSkuCode?: string;
  validationStatus?: string;
  validationErrors?: Record<string, unknown>;
};

export async function GET(request: Request, context: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await context.params;
  const { searchParams } = new URL(request.url);
  const limit = getLimit(searchParams, 250, 1000);

  try {
    const lines = await db
      .select()
      .from(rawOrderLines)
      .where(eq(rawOrderLines.uploadedFileId, fileId))
      .limit(limit);

    return ok({ lines });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await context.params;
  const body = await readJson<{ lines?: RawLineInput[] }>(request);

  if (!body?.lines?.length) {
    return badRequest("lines[] is required");
  }

  try {
    const [uploadedFile] = await db
      .select()
      .from(rawUploadedFiles)
      .where(eq(rawUploadedFiles.id, fileId))
      .limit(1);

    if (!uploadedFile) {
      return notFound("Uploaded file not found");
    }

    const values = body.lines.map((line, index) => ({
      uploadedFileId: uploadedFile.id,
      batchId: uploadedFile.batchId,
      rowNumber: line.rowNumber ?? index + 1,
      rawPayload: line.rawPayload,
      rowHash: rowHash(line.rawPayload),
      sourceOrderId: line.sourceOrderId,
      sourceSkuCode: line.sourceSkuCode,
      validationStatus: line.validationStatus ?? "parsed",
      validationErrors: line.validationErrors ?? null,
    }));

    const inserted = await db
      .insert(rawOrderLines)
      .values(values)
      .onConflictDoNothing()
      .returning();

    await db
      .update(rawUploadedFiles)
      .set({
        rowCount: sql`${rawUploadedFiles.rowCount} + ${inserted.length}`,
        parsingStatus: "parsed",
        updatedAt: new Date(),
      })
      .where(eq(rawUploadedFiles.id, uploadedFile.id));

    await db
      .update(uploadBatches)
      .set({
        totalRawRows: sql`${uploadBatches.totalRawRows} + ${inserted.length}`,
        updatedAt: new Date(),
      })
      .where(eq(uploadBatches.id, uploadedFile.batchId));

    return created({ inserted: inserted.length, skipped: values.length - inserted.length });
  } catch (error) {
    return serverError(error);
  }
}
