import { desc, eq } from "drizzle-orm";

import { appRoles, normalizeRole, roleLabels, type AppRole } from "@/lib/rbac";
import { auth } from "@/server/auth";
import { badRequest, created, ok, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { requireApiPermission } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserCreateBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: AppRole;
};

function sanitizeRole(value: unknown): AppRole | null {
  return typeof value === "string" && appRoles.includes(value as AppRole) ? (value as AppRole) : null;
}

export async function GET() {
  try {
    const access = await requireApiPermission("manageUsers");
    if (access instanceof Response) return access;

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    return ok({
      users: users.map((item) => ({
        ...item,
        role: normalizeRole(item.role),
        roleLabel: roleLabels[normalizeRole(item.role)],
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireApiPermission("manageUsers", request);
    if (access instanceof Response) return access;

    const body = await readJson<UserCreateBody>(request);
    const name = body?.name?.trim();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;
    const role = sanitizeRole(body?.role);

    if (!name || !email || !password || password.length < 8 || !role) {
      return badRequest("Name, email, role, and password with at least 8 characters are required.");
    }

    await auth.api.signUpEmail({
      body: { name, email, password },
      headers: request.headers,
    });

    const [createdUser] = await db
      .update(user)
      .set({ role, emailVerified: true, updatedAt: new Date() })
      .where(eq(user.email, email))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      });

    return created({
      user: {
        ...createdUser,
        role: normalizeRole(createdUser.role),
        roleLabel: roleLabels[normalizeRole(createdUser.role)],
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
