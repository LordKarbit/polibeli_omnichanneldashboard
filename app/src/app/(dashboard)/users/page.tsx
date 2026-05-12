"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, ShieldCheck, Trash2, UserCog, UsersRound } from "lucide-react";

import {
  appRoles,
  permissionCatalog,
  roleLabels,
  type AppRole,
  type PermissionKey,
  type RolePermissionMap,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string };
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  roleLabel: string;
  emailVerified: boolean;
  createdAt: string;
};

const roleTone: Record<AppRole, string> = {
  administrator: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  head: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  gt_mt: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  marketplace: "border-amber-300/30 bg-amber-300/10 text-amber-100",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

async function parseApiError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
  return payload?.error?.message ?? fallback;
}

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [permissions, setPermissions] = useState<Record<AppRole, RolePermissionMap> | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<AppRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "head" as AppRole,
  });

  const permissionGroups = useMemo(
    () =>
      permissionCatalog.reduce<Record<string, typeof permissionCatalog>>((groups, permission) => {
        groups[permission.group] = [...(groups[permission.group] ?? []), permission];
        return groups;
      }, {}),
    [],
  );

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const [usersResponse, permissionsResponse] = await Promise.all([
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/roles/permissions", { cache: "no-store" }),
      ]);

      if (!usersResponse.ok) throw new Error(await parseApiError(usersResponse, "Unable to load users."));
      if (!permissionsResponse.ok) throw new Error(await parseApiError(permissionsResponse, "Unable to load permissions."));

      const usersPayload = (await usersResponse.json()) as ApiResponse<{ users: ManagedUser[] }>;
      const permissionsPayload = (await permissionsResponse.json()) as ApiResponse<{
        roles: Record<AppRole, RolePermissionMap>;
      }>;

      setUsers(usersPayload.data?.users ?? []);
      setPermissions(permissionsPayload.data?.roles ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load user management.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [usersResponse, permissionsResponse] = await Promise.all([
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/roles/permissions", { cache: "no-store" }),
        ]);

        if (!usersResponse.ok) throw new Error(await parseApiError(usersResponse, "Unable to load users."));
        if (!permissionsResponse.ok) throw new Error(await parseApiError(permissionsResponse, "Unable to load permissions."));

        const usersPayload = (await usersResponse.json()) as ApiResponse<{ users: ManagedUser[] }>;
        const permissionsPayload = (await permissionsResponse.json()) as ApiResponse<{
          roles: Record<AppRole, RolePermissionMap>;
        }>;

        if (!cancelled) {
          setUsers(usersPayload.data?.users ?? []);
          setPermissions(permissionsPayload.data?.roles ?? null);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load user management.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error(await parseApiError(response, "Unable to create user."));

      setForm({ name: "", email: "", password: "", role: "head" });
      setMessage("User created successfully.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create user.");
    }
  }

  async function updateUserRole(userId: string, role: AppRole) {
    setMessage(null);
    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      setMessage(await parseApiError(response, "Unable to update user role."));
      return;
    }

    await loadData();
  }

  async function deleteUser(userId: string) {
    setMessage(null);
    const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });

    if (!response.ok) {
      setMessage(await parseApiError(response, "Unable to delete user."));
      return;
    }

    await loadData();
  }

  function togglePermission(role: AppRole, key: PermissionKey) {
    if (!permissions) return;
    if (role === "administrator" && key === "manageUsers") return;

    setPermissions({
      ...permissions,
      [role]: {
        ...permissions[role],
        [key]: !permissions[role][key],
      },
    });
  }

  async function saveRolePermissions(role: AppRole) {
    if (!permissions) return;
    setSavingRole(role);
    setMessage(null);

    try {
      const response = await fetch("/api/roles/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissions: permissions[role] }),
      });

      if (!response.ok) throw new Error(await parseApiError(response, "Unable to save role permissions."));
      const payload = (await response.json()) as ApiResponse<{ role: AppRole; permissions: RolePermissionMap }>;
      setPermissions((current) => current ? { ...current, [role]: payload.data?.permissions ?? current[role] } : current);
      setMessage(`${roleLabels[role]} permissions saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save permissions.");
    } finally {
      setSavingRole(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-[8px] border border-border bg-card/80 p-5 shadow-sm shadow-black/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Access Governance</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Users & role control</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tambahkan user, tetapkan role, dan ubah permission menu tanpa menyentuh kode aplikasi.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-primary/25 bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <form onSubmit={createUser} className="mt-6 grid gap-3">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="h-10 rounded-[8px] border border-border bg-background/50 px-3 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/10"
              placeholder="Full name"
              required
            />
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="h-10 rounded-[8px] border border-border bg-background/50 px-3 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/10"
              placeholder="Email"
              required
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="h-10 rounded-[8px] border border-border bg-background/50 px-3 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/10"
                placeholder="Temporary password"
                minLength={8}
                required
              />
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AppRole }))}
                className="h-10 rounded-[8px] border border-border bg-background/50 px-3 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/10"
              >
                {appRoles.map((role) => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-[8px] border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {message}
            </div>
          )}
        </div>

        <div className="rounded-[8px] border border-border bg-card/80 p-5 shadow-sm shadow-black/10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Directory</p>
              <h3 className="text-lg font-semibold text-foreground">Active Users</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border bg-muted/30 text-muted-foreground">
              <UsersRound className="h-5 w-5" />
            </div>
          </div>

          {loading ? (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading users...
            </div>
          ) : (
            <div className="grid gap-3">
              {users.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-[8px] border border-border bg-background/35 p-3 md:grid-cols-[1fr_190px_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Created {formatDate(item.createdAt)}</p>
                  </div>
                  <select
                    value={item.role}
                    onChange={(event) => updateUserRole(item.id, event.target.value as AppRole)}
                    className="h-9 rounded-[8px] border border-border bg-card px-2 text-xs font-semibold text-foreground outline-none"
                  >
                    {appRoles.map((role) => (
                      <option key={role} value={role}>{roleLabels[role]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteUser(item.id)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[8px] border border-border bg-card/80 p-5 shadow-sm shadow-black/10">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Role Permission Matrix</p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">Menu and data access rules</h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Permission di sini dipakai oleh sidebar, layout guard, dan API guard. Perubahan langsung memengaruhi sesi berikutnya.
          </p>
        </div>

        {permissions ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {appRoles.map((role) => (
              <div key={role} className="rounded-[8px] border border-border bg-background/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className={cn("inline-flex rounded-[8px] border px-2.5 py-1 text-xs font-bold", roleTone[role])}>
                      {roleLabels[role]}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">{Object.values(permissions[role]).filter(Boolean).length} permissions enabled</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveRolePermissions(role)}
                    disabled={savingRole === role}
                    className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-60"
                  >
                    {savingRole === role ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {Object.entries(permissionGroups).map(([group, items]) => (
                    <div key={group}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group}</p>
                      <div className="grid gap-2">
                        {items.map((permission) => {
                          const enabled = permissions[role][permission.key];
                          const locked = role === "administrator" && permission.key === "manageUsers";
                          return (
                            <button
                              key={permission.key}
                              type="button"
                              onClick={() => togglePermission(role, permission.key)}
                              disabled={locked}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-left transition",
                                enabled
                                  ? "border-primary/25 bg-primary/10"
                                  : "border-border bg-card/40 hover:bg-muted/30",
                                locked && "cursor-not-allowed opacity-80",
                              )}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-foreground">{permission.label}</span>
                                <span className="block truncate text-[11px] text-muted-foreground">{permission.description}</span>
                              </span>
                              <span
                                className={cn(
                                  "h-5 w-9 rounded-full border p-0.5 transition",
                                  enabled ? "border-primary/40 bg-primary" : "border-border bg-muted/40",
                                )}
                              >
                                <span
                                  className={cn(
                                    "block h-4 w-4 rounded-full bg-white transition",
                                    enabled && "translate-x-4",
                                  )}
                                />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
            <UserCog className="mr-2 h-4 w-4" />
            Permission matrix unavailable.
          </div>
        )}
      </section>
    </div>
  );
}
