import { sql } from "drizzle-orm";

import { ok, serverError } from "@/server/api/http";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await db.execute(sql`select 1 as ok`);
    return ok({
      status: "healthy",
      database: result ? "connected" : "unknown",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return serverError(error);
  }
}
