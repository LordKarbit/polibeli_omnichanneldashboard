"use client";

import { useEffect, useState } from "react";

import type { IncomeDashboardData } from "@/server/analytics/income-dashboard";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string };
};

export type IncomeDashboard = IncomeDashboardData;

export function useIncomeDashboardData(refreshKey = 0) {
  const [data, setData] = useState<IncomeDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.dispatchEvent(new CustomEvent("dashboard-data-loading", { detail: { loading: true, query: "income" } }));

    fetch("/api/analytics/income", { cache: "no-store" })
      .then((response) => {
        if (response.status === 401) {
          window.location.href = "/login";
        }
        return response.json() as Promise<ApiResponse<IncomeDashboard>>;
      })
      .then((payload) => {
        if (cancelled) return;
        if (!payload.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "Failed to load income dashboard");
        }
        setData(payload.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load income dashboard");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          window.dispatchEvent(new CustomEvent("dashboard-data-loading", { detail: { loading: false, query: "income" } }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { data, isLoading, error };
}
