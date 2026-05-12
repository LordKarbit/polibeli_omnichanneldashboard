import { eq, sql } from "drizzle-orm";

import { auth } from "@/server/auth";
import { badRequest, created, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { rejectCrossOriginMutation } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SetupBody = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const originRejection = rejectCrossOriginMutation(request);
    if (originRejection) return originRejection;

    const body = (await request.json().catch(() => null)) as SetupBody | null;
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;

    if (!email || !email.includes("@") || !password || password.length < 8) {
      return badRequest("Valid email and password with at least 8 characters are required.");
    }

    const [countRow] = await db.select({ total: sql<number>`count(*)` }).from(user);
    if (Number(countRow?.total ?? 0) > 0) {
      return badRequest("Administrator setup is already completed.");
    }

    await auth.api.signUpEmail({
      body: { name: body?.name?.trim() || email.split("@")[0] || "Administrator", email, password },
      headers: request.headers,
    });

    const [administrator] = await db
      .update(user)
      .set({ role: "administrator", emailVerified: true, updatedAt: new Date() })
      .where(eq(user.email, email))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

    return created({ user: administrator });
  } catch (error) {
    return serverError(error);
  }
}
