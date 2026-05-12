import { appRoles, permissionCatalog, type AppRole, type PermissionKey } from "@/lib/rbac";
import { badRequest, ok, readJson, serverError } from "@/server/api/http";
import { getAllRolePermissions, requireApiPermission, setRolePermissions } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RolePermissionBody = {
  role?: AppRole;
  permissions?: Partial<Record<PermissionKey, boolean>>;
};

export async function GET() {
  try {
    const access = await requireApiPermission("manageUsers");
    if (access instanceof Response) return access;

    const roles = await getAllRolePermissions();
    return ok({ roles, permissionCatalog });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireApiPermission("manageUsers", request);
    if (access instanceof Response) return access;

    const body = await readJson<RolePermissionBody>(request);
    if (!body?.role || !appRoles.includes(body.role) || !body.permissions) {
      return badRequest("role and permissions are required.");
    }

    if (body.role === "administrator" && body.permissions.manageUsers === false) {
      return badRequest("Administrator must keep User Management permission.");
    }

    const permissions = await setRolePermissions(body.role, body.permissions);
    return ok({ role: body.role, permissions });
  } catch (error) {
    return serverError(error);
  }
}
