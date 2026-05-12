"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  allowedChannelKeysForRole,
  canAccessPath,
  channelLabels,
  firstAllowedPath,
  roleLabels,
  type AppRole,
  type ChannelKey,
  type RolePermissionMap,
} from "@/lib/rbac";

type DashboardAccessContextValue = {
  user: {
    id: string;
    name: string;
    email: string;
    role: AppRole;
  };
  role: AppRole;
  roleLabel: string;
  permissions: RolePermissionMap;
  allowedChannels: Array<{ key: ChannelKey; name: string }>;
};

const DashboardAccessContext = createContext<DashboardAccessContextValue | null>(null);

export function DashboardAccessProvider({
  user,
  permissions,
  children,
}: {
  user: DashboardAccessContextValue["user"];
  permissions: RolePermissionMap;
  children: ReactNode;
}) {
  const value = useMemo<DashboardAccessContextValue>(
    () => ({
      user,
      role: user.role,
      roleLabel: roleLabels[user.role],
      permissions,
      allowedChannels: allowedChannelKeysForRole(user.role).map((key) => ({ key, name: channelLabels[key] })),
    }),
    [permissions, user],
  );

  return <DashboardAccessContext.Provider value={value}>{children}</DashboardAccessContext.Provider>;
}

export function useDashboardAccess() {
  const context = useContext(DashboardAccessContext);
  if (!context) {
    throw new Error("useDashboardAccess must be used inside DashboardAccessProvider.");
  }
  return context;
}

export function DashboardAccessBoundary({ children }: { children: ReactNode }) {
  const { permissions } = useDashboardAccess();
  const pathname = usePathname();
  const router = useRouter();
  const hasAccess = canAccessPath(pathname, permissions);

  useEffect(() => {
    if (!hasAccess) {
      router.replace(firstAllowedPath(permissions));
    }
  }, [hasAccess, permissions, router]);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[8px] border border-border bg-card/80 p-8 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">Access is being redirected</p>
          <p className="mt-1 text-xs text-muted-foreground">Your role does not have permission for this menu.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
