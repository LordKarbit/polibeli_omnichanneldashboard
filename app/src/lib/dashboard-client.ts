"use client";

import { useEffect, useMemo, useState } from "react";

export interface ChannelSummary {
  channelKey: string;
  channel: string;
  sourceSystem: string;
  shopAccount: string;
  channelGroup: string;
  orders: number;
  activeOrders: number;
  cancelledOrders: number;
  bookedGMV: number;
  activeGMV: number;
  refundAmount: number;
  quantity: number;
  lineItems: number;
  aov: number;
  cancellationRate: number;
  percentage: number;
}

export interface DailyGMVPoint {
  date: string;
  gt: number;
  mt: number;
  shopee: number;
  tiktok1: number;
  tiktok2: number;
  bookedGMV: number;
  activeGMV: number;
  orders: number;
}

export interface ManagerSummary {
  name: string;
  parentManager?: string;
  role: string;
  orders: number;
  activeOrders: number;
  bookedGMV: number;
  activeGMV: number;
  quantity: number;
  customers: number;
  percentageOfGT: number;
}

export interface SkuSummary {
  skuCode: string;
  skuName: string;
  skuType: string;
  totalGMV: number;
  gtGMV: number;
  mtGMV: number;
  shopee: number;
  tiktok1: number;
  tiktok2: number;
  quantity: number;
  orders: number;
  zeroValueItems: number;
}

export interface LocationSummary {
  source: string;
  channelKey: string;
  province: string;
  city: string;
  district: string | null;
  orders: number;
  gmv: number;
  activeGMV: number;
  cancellationValue: number;
  regionalManager: string | null;
  areaManager: string | null;
}

export interface StatusSummary {
  source: string;
  status: string;
  orders: number;
  gmv: number;
  percentWithinSource: number;
}

export interface RecentOrderSummary {
  orderKey: string;
  sourceOrderId: string;
  source: string;
  shopAccount: string;
  channelGroup: string;
  status: string;
  orderCreatedAt: string | null;
  bookedGMV: number;
  activeGMV: number;
  refundAmount: number;
  province: string | null;
  city: string | null;
  regionalManager: string | null;
  areaManager: string | null;
  customer: string | null;
  cancellationReason: string | null;
}

export interface GeoTransactionSummary extends RecentOrderSummary {
  channelKey: string;
  channel: string;
  district: string | null;
  salesName: string | null;
}

export interface CustomerRetentionSummary {
  customer: string;
  channel: string;
  channelKey: string;
  orders: number;
  totalGMV: number;
  firstOrder: string | null;
  lastOrder: string | null;
}

export interface CustomerRetentionChannel {
  channel: string;
  channelKey: string;
  uniqueCustomers: number;
  oneTimeCustomers: number;
  twoTimeCustomers: number;
  threeToFiveCustomers: number;
  sixPlusCustomers: number;
  repeatCustomers: number;
  returningCustomers: number;
  repeatRate: number;
  returningRate: number;
  avgPurchaseFrequency: number;
  totalOrders: number;
  totalGMV: number;
}

export interface CustomerRetentionMonthly extends CustomerRetentionChannel {
  month: string;
  monthLabel: string;
}

export interface CustomerRetentionCustomer {
  customer: string;
  channel: string;
  channelKey: string;
  purchaseCount: number;
  segment: string;
  activeMonths: number;
  totalGMV: number;
  firstOrder: string | null;
  lastOrder: string | null;
}

export interface CustomerRetentionAnalytics {
  summary: Omit<CustomerRetentionChannel, "channel" | "channelKey">;
  channels: CustomerRetentionChannel[];
  monthly: CustomerRetentionMonthly[];
  customers: CustomerRetentionCustomer[];
}

export interface UploadSummary {
  id: string;
  fileName: string;
  sourceSystem: string;
  shopAccount: string | null;
  rows: number;
  columns: number;
  status: string;
  createdAt: string;
  schemaDetected?: { missing?: string[]; isValid?: boolean } | null;
}

export interface DashboardData {
  hasData: boolean;
  generatedAt: string;
  summary: {
    bookedGMV: number;
    activeGMV: number;
    refundAmount: number;
    orders: number;
    activeOrders: number;
    cancelledOrders: number;
    rawRows: number;
    lineItems: number;
    quantity: number;
    customers: number;
    aov: number;
    cancellationRate: number;
    dateRange: { start: string | null; end: string | null };
  };
  channels: ChannelSummary[];
  dailyGMV: DailyGMVPoint[];
  managers: {
    regional: ManagerSummary[];
    area: ManagerSummary[];
  };
  skus: SkuSummary[];
  locations: LocationSummary[];
  statuses: StatusSummary[];
  orders: RecentOrderSummary[];
  geoTransactions: GeoTransactionSummary[];
  customerRetention: CustomerRetentionSummary[];
  customerRetentionAnalytics: CustomerRetentionAnalytics;
  uploads: UploadSummary[];
  dataQuality: {
    totalRows: number;
    validRows: number;
    validPercent: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
    metrics: Array<{ category: string; count: number; severity: "error" | "warning" | "info"; description: string }>;
    zeroValueItems: Array<{ source: string; productName: string; count: number; totalQty: number }>;
    schemaMismatches: Array<{ file: string; field: string; issue: string; severity: "error" | "warning" | "info" }>;
  };
  filterOptions: {
    channels: Array<{ key: string; name: string }>;
    statuses: string[];
    regionalManagers: string[];
    areaManagers: string[];
    provinces: string[];
    cities: string[];
    skuTypes: string[];
  };
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { message?: string };
}

type DashboardFilterChangeEvent = CustomEvent<{ query?: string }>;

const DASHBOARD_CACHE_TTL_MS = 45_000;
const dashboardDataCache = new Map<string, { data: DashboardData; expiresAt: number }>();
const dashboardRequestCache = new Map<string, Promise<DashboardData>>();

function makeDashboardCacheKey(query: string, refreshKey: number) {
  return `${query}|${refreshKey}`;
}

function getCachedDashboardData(cacheKey: string) {
  const cached = dashboardDataCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    dashboardDataCache.delete(cacheKey);
    return null;
  }
  return cached.data;
}

function setCachedDashboardData(cacheKey: string, data: DashboardData) {
  dashboardDataCache.set(cacheKey, { data, expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS });
}

function loadDashboardData(query: string, cacheKey: string) {
  const currentRequest = dashboardRequestCache.get(cacheKey);
  if (currentRequest) return currentRequest;

  const request = fetch(`/api/analytics/summary${query ? `?${query}` : ""}`, { cache: "no-store" })
    .then((response) => response.json() as Promise<ApiResponse<DashboardData>>)
    .then((payload) => {
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to load dashboard data");
      }
      setCachedDashboardData(cacheKey, payload.data);
      return payload.data;
    })
    .finally(() => {
      dashboardRequestCache.delete(cacheKey);
    });

  dashboardRequestCache.set(cacheKey, request);
  return request;
}

export function clearDashboardDataCache() {
  dashboardDataCache.clear();
  dashboardRequestCache.clear();
}

export function useDashboardData(refreshKey = 0, options: { initialData?: DashboardData | null } = {}) {
  const initialQuery = typeof window === "undefined" ? "" : window.location.search.slice(1);
  const initialCacheKey = makeDashboardCacheKey(initialQuery, refreshKey);
  const [initialSnapshot] = useState(() => {
    const data = options.initialData ?? getCachedDashboardData(initialCacheKey);
    return {
      cacheKey: data ? initialCacheKey : null,
      data,
    };
  });
  const [query, setQuery] = useState(() => initialQuery);
  const [data, setData] = useState<DashboardData | null>(() => initialSnapshot.data);
  const [isLoading, setIsLoading] = useState(() => !initialSnapshot.data);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = useMemo(() => makeDashboardCacheKey(query, refreshKey), [query, refreshKey]);

  useEffect(() => {
    const syncQuery = (event?: Event) => {
      const nextQuery =
        event instanceof CustomEvent && typeof (event as DashboardFilterChangeEvent).detail?.query === "string"
          ? (event as DashboardFilterChangeEvent).detail.query ?? ""
          : window.location.search.slice(1);

      if (nextQuery !== query) {
        setError(null);
        const nextCacheKey = makeDashboardCacheKey(nextQuery, refreshKey);
        const cached = getCachedDashboardData(nextCacheKey);

        if (cached) {
          setData(cached);
          setIsLoading(false);
          window.dispatchEvent(new CustomEvent("dashboard-data-loading", { detail: { loading: false, query: nextQuery } }));
        } else {
          setIsLoading(true);
          window.dispatchEvent(new CustomEvent("dashboard-data-loading", { detail: { loading: true, query: nextQuery } }));
        }
      }

      setQuery(nextQuery);
    };

    window.addEventListener("popstate", syncQuery);
    window.addEventListener("dashboard-filter-change", syncQuery);

    return () => {
      window.removeEventListener("popstate", syncQuery);
      window.removeEventListener("dashboard-filter-change", syncQuery);
    };
  }, [query, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    if (initialSnapshot.cacheKey === cacheKey && initialSnapshot.data) {
      setCachedDashboardData(cacheKey, initialSnapshot.data);
      window.dispatchEvent(new CustomEvent("dashboard-data-loading", { detail: { loading: false, query } }));
      return () => {
        cancelled = true;
      };
    }

    const cached = getCachedDashboardData(cacheKey);

    if (cached) {
      window.dispatchEvent(new CustomEvent("dashboard-data-loading", { detail: { loading: false, query } }));
      return () => {
        cancelled = true;
      };
    }

    window.dispatchEvent(new CustomEvent("dashboard-data-loading", { detail: { loading: true, query } }));

    loadDashboardData(query, cacheKey)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          window.dispatchEvent(new CustomEvent("dashboard-data-loading", { detail: { loading: false, query } }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, cacheKey, initialSnapshot.cacheKey, initialSnapshot.data]);

  return { data, isLoading, error };
}
