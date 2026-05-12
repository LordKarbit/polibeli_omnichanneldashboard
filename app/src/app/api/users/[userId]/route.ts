import { eq, sql } from "drizzle-orm";

import { appRoles, normalizeRole, roleLabels, type AppRole } from "@/lib/rbac";
import { badRequest, notFound, ok, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { requireApiPermission } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserUpdateBody = {
  name?: string;
  role?: AppRole;
};

function sanitizeRole(value: unknown): AppRole | null {
  return typeof value === "string" && appRoles.includes(value as AppRole) ? (value as AppRole) : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;

  try {
    const access = await requireApiPermission("manageUsers", request);
    if (access instanceof Response) return access;

    const body = await readJson<UserUpdateBody>(request);
    const role = body?.role ? sanitizeRole(body.role) : undefined;
    const name = body?.name?.trim();

    if (body?.role && !role) {
      return badRequest("Invalid role.");
    }

    const [targetUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (!targetUser) return notFound("User not found");

    if (targetUser.role === "administrator" && role && role !== "administrator") {
      const [row] = await db
        .select({ total: sql<number>`count(*)` })
        .from(user)
        .where(eq(user.role, "administrator"));

      if (Number(row?.total ?? 0) <= 1) {
        return badRequest("At least one administrator must remain active.");
      }
    }

    const [updatedUser] = await db
      .update(user)
      .set({
        ...(name ? { name } : {}),
        ...(role ? { role } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

    return ok({
      user: {
        ...updatedUser,
        role: normalizeRole(updatedUser.role),
        roleLabel: roleLabels[normalizeRole(updatedUser.role)],
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;

  try {
    const access = await requireApiPermission("manageUsers", request);
    if (access instanceof Response) return access;

    if (userId === access.session.user.id) {
      return badRequest("You cannot delete your own administrator account.");
    }

    const [targetUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (!targetUser) return notFound("User not found");

    if (targetUser.role === "administrator") {
      const [row] = await db
        .select({ total: sql<number>`count(*)` })
        .from(user)
        .where(eq(user.role, "administrator"));

      if (Number(row?.total ?? 0) <= 1) {
        return badRequest("At least one administrator must remain active.");
      }
    }

    await db.delete(user).where(eq(user.id, userId));
    return ok({ deleted: true });
  } catch (error) {
    return serverError(error);
  }
}
