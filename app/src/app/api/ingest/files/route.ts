import { badRequest, created, serverError } from "@/server/api/http";
import { processDashboardFiles, type SourceHint } from "@/server/ingestion/dashboard-ingestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE_HINTS = new Set(["b2b", "shopee", "tiktok1", "tiktok2"]);

function toSourceHint(value: FormDataEntryValue | null): SourceHint | undefined {
  const text = typeof value === "string" ? value : "";
  return SOURCE_HINTS.has(text) ? (text as SourceHint) : undefined;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const sourceHint = toSourceHint(formData.get("sourceHint"));
    const replace = formData.get("replace") === "true";

    if (!files.length) {
      return badRequest("At least one file is required in form field files[]");
    }

    const inputs = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
        sourceHint,
      })),
    );

    const result = await processDashboardFiles(inputs, {
      replace,
      persistFiles: true,
      notes: "Manual dashboard upload",
    });

    return created(result);
  } catch (error) {
    return serverError(error);
  }
}
