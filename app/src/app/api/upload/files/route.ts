import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { eq, sql } from "drizzle-orm";

import { badRequest, created, getLimit, ok, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { rawUploadedFiles, uploadBatches } from "@/server/db/schema";
import { sha256 } from "@/server/ingestion/hash";
import { requireApiPermission } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);
}

async function persistFile(batchId: string, file: File, fileHash: string) {
  const uploadDir = join(process.cwd(), "data", "uploads", batchId);
  await mkdir(uploadDir, { recursive: true });
  const storedFilePath = join(uploadDir, `${fileHash}-${sanitizeFileName(file.name)}`);
  await writeFile(storedFilePath, Buffer.from(await file.arrayBuffer()));
  return storedFilePath;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = getLimit(searchParams, 100, 500);
  const batchId = searchParams.get("batchId");

  try {
    const access = await requireApiPermission("viewUpload");
    if (access instanceof Response) return access;

    const query = db
      .select()
      .from(rawUploadedFiles)
      .limit(limit);

    const files = batchId
      ? await query.where(eq(rawUploadedFiles.batchId, batchId))
      : await query;

    return ok({ files });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireApiPermission("uploadData", request);
    if (access instanceof Response) return access;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const batchId = String(formData.get("batchId") ?? "");
      const sourceSystem = String(formData.get("sourceSystem") ?? "");
      const shopAccount = String(formData.get("shopAccount") ?? "");
      const channelHint = String(formData.get("channelHint") ?? "");

      if (!batchId || !sourceSystem || !(file instanceof File)) {
        return badRequest("batchId, sourceSystem, and file are required");
      }

      const buffer = await file.arrayBuffer();
      const fileHash = sha256(buffer);
      const storedFilePath = await persistFile(batchId, file, fileHash);
      const [uploadedFile] = await db
        .insert(rawUploadedFiles)
        .values({
          batchId,
          sourceSystem,
          shopAccount: shopAccount || null,
          channelHint: channelHint || null,
          originalFileName: file.name,
          storedFilePath,
          fileType: file.type || file.name.split(".").pop(),
          fileHash,
          fileSizeBytes: file.size,
        })
        .onConflictDoUpdate({
          target: rawUploadedFiles.fileHash,
          set: {
            batchId,
            updatedAt: new Date(),
            parsingStatus: "duplicate_detected",
          },
        })
        .returning();

      await db
        .update(uploadBatches)
        .set({
          totalFiles: sql`${uploadBatches.totalFiles} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(uploadBatches.id, batchId));

      return created({ file: uploadedFile });
    }

    const body = await readJson<{
      batchId?: string;
      sourceSystem?: string;
      shopAccount?: string;
      channelHint?: string;
      originalFileName?: string;
      fileType?: string;
      fileHash?: string;
      fileSizeBytes?: number;
      rowCount?: number;
      columnCount?: number;
      schemaDetected?: Record<string, unknown>;
    }>(request);

    if (!body?.batchId || !body.sourceSystem || !body.originalFileName || !body.fileHash) {
      return badRequest("batchId, sourceSystem, originalFileName, and fileHash are required");
    }

    const [uploadedFile] = await db
      .insert(rawUploadedFiles)
      .values({
        batchId: body.batchId,
        sourceSystem: body.sourceSystem,
        shopAccount: body.shopAccount,
        channelHint: body.channelHint,
        originalFileName: body.originalFileName,
        fileType: body.fileType,
        fileHash: body.fileHash,
        fileSizeBytes: body.fileSizeBytes ?? 0,
        rowCount: body.rowCount ?? 0,
        columnCount: body.columnCount ?? 0,
        schemaDetected: body.schemaDetected ?? null,
      })
      .onConflictDoUpdate({
        target: rawUploadedFiles.fileHash,
        set: {
          updatedAt: new Date(),
          parsingStatus: "duplicate_detected",
        },
      })
      .returning();

    await db
      .update(uploadBatches)
      .set({
        totalFiles: sql`${uploadBatches.totalFiles} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(uploadBatches.id, body.batchId));

    return created({ file: uploadedFile });
  } catch (error) {
    return serverError(error);
  }
}
