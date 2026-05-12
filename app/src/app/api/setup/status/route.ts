import { sql } from "drizzle-orm";

import { ok, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [row] = await db.select({ total: sql<number>`count(*)` }).from(user);
    return ok({ hasUsers: Number(row?.total ?? 0) > 0 });
  } catch (error) {
    return serverError(error);
  }
}
