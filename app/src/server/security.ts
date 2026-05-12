import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import {
  allowedChannelKeysForRole,
  appRoles,
  channelKeyFromOrder,
  defaultRolePermissions,
  filterAllowedChannels,
  mergeRolePermissions,
  normalizeRole,
  type AppRole,
  type ChannelKey,
  type PermissionKey,
  type RolePermissionMap,
} from "@/lib/rbac";
import { auth, type AuthSession } from "@/server/auth";
import { badRequest, forbidden, unauthorized } from "@/server/api/http";
import { db } from "@/server/db";
import { rolePermissions } from "@/server/db/schema";

export type AppSession = AuthSession & {
  user: AuthSession["user"] & { role?: string | null };
};

export type ApiAccess = {
  session: AppSession;
  role: AppRole;
  permissions: RolePermissionMap;
};

let rbacTableReady: Promise<void> | null = null;

const configuredAppOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(","),
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

const localDevelopmentOrigins = [
  ...Array.from({ length: 31 }, (_, index) => `http://localhost:${3000 + index}`),
  ...Array.from({ length: 31 }, (_, index) => `http://127.0.0.1:${3000 + index}`),
];

function isPermissionKey(value: string): value is PermissionKey {
  return value in defaultRolePermissions.administrator;
}

async function ensureRbacTable() {
  if (!rbacTableReady) {
    rbacTableReady = (async () => {
      await db
        .insert(rolePermissions)
        .values(
          Object.entries(defaultRolePermissions).map(([role, permissions]) => ({
            role,
            permissions,
            updatedAt: new Date(),
          })),
        )
        .onConflictDoNothing();
    })();
  }

  await rbacTableReady;
}

function requestOriginFromHeaders(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (!host) return null;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto ?? (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function rejectCrossOriginMutation(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return null;
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return forbidden("Invalid request origin.");
  }

  const requestOrigin = requestOriginFromHeaders(request);
  const allowedOrigins = new Set(
    [requestOrigin, ...configuredAppOrigins, ...(process.env.NODE_ENV === "production" ? [] : localDevelopmentOrigins)]
      .map((value) => (value ? normalizeOrigin(value) : null))
      .filter((value): value is string => Boolean(value)),
  );

  if (!allowedOrigins.has(normalizedOrigin)) {
    return forbidden("Cross-origin mutation rejected.");
  }

  return null;
}

export async function getCurrentSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return session as AppSession | null;
  } catch {
    return null;
  }
}

export async function getRolePermissions(role: AppRole) {
  await ensureRbacTable();

  const [stored] = await db
    .select({ permissions: rolePermissions.permissions })
    .from(rolePermissions)
    .where(eq(rolePermissions.role, role))
    .limit(1);

  return mergeRolePermissions(role, stored?.permissions ?? null);
}

export async function setRolePermissions(role: AppRole, permissions: Partial<Record<PermissionKey, boolean>>) {
  await ensureRbacTable();

  const sanitized = Object.fromEntries(
    Object.entries(permissions).filter(([key]) => isPermissionKey(key)),
  ) as Partial<Record<PermissionKey, boolean>>;
  const merged = mergeRolePermissions(role, sanitized);

  await db
    .insert(rolePermissions)
    .values({
      role,
      permissions: merged,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: rolePermissions.role,
      set: {
        permissions: merged,
        updatedAt: new Date(),
      },
    });

  return merged;
}

export async function getAllRolePermissions() {
  const entries = await Promise.all(
    (Object.keys(defaultRolePermissions) as AppRole[]).map(async (role) => [role, await getRolePermissions(role)] as const),
  );

  return Object.fromEntries(entries) as Record<AppRole, RolePermissionMap>;
}

export async function requireApiSession(request?: Request): Promise<ApiAccess | Response> {
  if (request) {
    const originRejection = rejectCrossOriginMutation(request);
    if (originRejection) return originRejection;
  }

  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return unauthorized();
  }

  const role = normalizeRole(session.user.role);
  const permissions = await getRolePermissions(role);
  return { session, role, permissions };
}

export async function requireApiPermission(permission: PermissionKey, request?: Request): Promise<ApiAccess | Response> {
  const access = await requireApiSession(request);
  if (access instanceof Response) return access;

  if (!access.permissions[permission]) {
    return forbidden("Your role cannot access this feature.");
  }

  return access;
}

export async function requireDashboardSession() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = normalizeRole(session.user.role);
  const permissions = await getRolePermissions(role);

  return { session, role, permissions };
}

export function scopedDashboardSearchParams(searchParams: URLSearchParams, role: AppRole) {
  const next = new URLSearchParams(searchParams);
  const selected = next.get("channels")?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  const allowed = filterAllowedChannels(selected.length ? selected : allowedChannelKeysForRole(role), role);
  next.set("channels", allowed.join(","));
  return next;
}

type DashboardScopeShape = {
  channels: Array<{ channelKey?: string | null }>;
  dailyGMV: Array<Record<string, string | number>>;
  skus: Array<Record<string, unknown>>;
  locations: Array<{ channelKey?: string | null }>;
  marketplacePurchaseChannels: Array<{ channelKey?: string | null }>;
  geoTransactions: Array<{ channelKey?: string | null }>;
  customerRetention: Array<{ channelKey?: string | null }>;
  customerRetentionAnalytics: {
    channels: Array<{ channelKey?: string | null }>;
    monthly: Array<{ channelKey?: string | null }>;
    customers: Array<{ channelKey?: string | null }>;
  };
  filterOptions: {
    channels: Array<{ key: string; name: string }>;
    regionalManagers: string[];
    areaManagers: string[];
  };
};

export function constrainDashboardDataForRole<T extends DashboardScopeShape>(data: T, role: AppRole): T {
  const allowed = new Set<ChannelKey>(allowedChannelKeysForRole(role));
  const isAllowed = (channelKey?: string | null) => allowed.has(channelKey as ChannelKey);

  return {
    ...data,
    channels: data.channels.filter((channel) => isAllowed(channel.channelKey)),
    dailyGMV: data.dailyGMV.map((point) => ({
      ...point,
      gt: allowed.has("gt") ? point.gt ?? 0 : 0,
      mt: allowed.has("mt") ? point.mt ?? 0 : 0,
      shopee: allowed.has("shopee") ? point.shopee ?? 0 : 0,
      tiktok1: allowed.has("tiktok1") ? point.tiktok1 ?? 0 : 0,
      tiktok2: allowed.has("tiktok2") ? point.tiktok2 ?? 0 : 0,
    })),
    skus: data.skus.map((sku) => ({
      ...sku,
      gtGMV: allowed.has("gt") ? sku.gtGMV ?? 0 : 0,
      mtGMV: allowed.has("mt") ? sku.mtGMV ?? 0 : 0,
      shopee: allowed.has("shopee") ? sku.shopee ?? 0 : 0,
      tiktok1: allowed.has("tiktok1") ? sku.tiktok1 ?? 0 : 0,
      tiktok2: allowed.has("tiktok2") ? sku.tiktok2 ?? 0 : 0,
    })),
    locations: data.locations.filter((location) => isAllowed(location.channelKey)),
    marketplacePurchaseChannels: data.marketplacePurchaseChannels.filter((channel) => isAllowed(channel.channelKey)),
    geoTransactions: data.geoTransactions.filter((transaction) => isAllowed(transaction.channelKey)),
    customerRetention: data.customerRetention.filter((customer) => isAllowed(customer.channelKey)),
    customerRetentionAnalytics: {
      ...data.customerRetentionAnalytics,
      channels: data.customerRetentionAnalytics.channels.filter((channel) => isAllowed(channel.channelKey)),
      monthly: data.customerRetentionAnalytics.monthly.filter((channel) => isAllowed(channel.channelKey)),
      customers: data.customerRetentionAnalytics.customers.filter((customer) => isAllowed(customer.channelKey)),
    },
    filterOptions: {
      ...data.filterOptions,
      channels: data.filterOptions.channels.filter((channel) => isAllowed(channel.key)),
      regionalManagers: role === "marketplace" ? [] : data.filterOptions.regionalManagers,
      areaManagers: role === "marketplace" ? [] : data.filterOptions.areaManagers,
    },
  };
}

export function canAccessOrderForRole(
  role: AppRole,
  order: { channelGroup?: string | null; sourceSystem?: string | null; shopAccount?: string | null },
) {
  const channelKey = channelKeyFromOrder(order);
  return channelKey ? allowedChannelKeysForRole(role).includes(channelKey) : false;
}

export function requireValidRole(value: unknown) {
  if (typeof value !== "string" || !appRoles.includes(value as AppRole)) {
    return badRequest("Invalid role.");
  }

  return value as AppRole;
}
