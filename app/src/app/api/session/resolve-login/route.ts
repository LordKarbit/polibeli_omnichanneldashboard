import { sql } from "drizzle-orm";

import { badRequest, ok, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { rejectCrossOriginMutation } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResolveLoginBody = {
  identifier?: string;
};

export async function POST(request: Request) {
  try {
    const originRejection = rejectCrossOriginMutation(request);
    if (originRejection) return originRejection;

    const body = await readJson<ResolveLoginBody>(request);
    const identifier = body?.identifier?.trim().toLowerCase();

    if (!identifier) {
      return badRequest("User or email is required.");
    }

    if (identifier.includes("@")) {
      return ok({ email: identifier });
    }

    const [matchedUser] = await db
      .select({ email: user.email })
      .from(user)
      .where(sql`lower(${user.name}) = ${identifier} or lower(${user.email}) = ${identifier}`)
      .limit(1);

    if (!matchedUser?.email) {
      return badRequest("Invalid user/email or password.");
    }

    return ok({ email: matchedUser.email });
  } catch (error) {
    return serverError(error);
  }
}
