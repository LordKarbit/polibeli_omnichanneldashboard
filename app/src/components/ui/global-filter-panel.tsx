"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Download,
  Filter,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
} from "lucide-react";

import type { DashboardFilterOptions } from "@/lib/dashboard-client";
import { cn } from "@/lib/utils";
import { useDashboardAccess } from "@/components/layout/dashboard-access-provider";

const fallbackChannels = [
  { key: "gt", name: "GT" },
  { key: "mt", name: "MT" },
  { key: "shopee", name: "Shopee" },
  { key: "tiktok1", name: "TikTok Shop (Kayou ID)" },
  { key: "tiktok2", name: "TikTok Shop (Kayou Card ID)" },
];
const marketplaceChannelKeys = new Set(["shopee", "tiktok1", "tiktok2"]);
const marketplaceFallbackChannels = fallbackChannels.filter((channel) => marketplaceChannelKeys.has(channel.key));

const metrics = ["Active GMV", "Booked GMV", "Refund", "Quantity", "Orders", "AOV"];
const fallbackFilterOptions: DashboardFilterOptions = {
  channels: fallbackChannels,
  statuses: ["completed", "shipped", "cancelled", "pending"],
  regionalManagers: [],
  areaManagers: [],
  provinces: [],
  cities: [],
  skuTypes: [],
};

type FilterDraft = {
  channels: string[];
  excludeCancelled: boolean;
  metric: string;
  status: string;
  start: string;
  end: string;
  regionalManager: string;
  areaManager: string;
  province: string;
  city: string;
  skuType: string;
};

const inputClassName =
  "h-10 w-full rounded-[8px] border border-border bg-background/40 px-3 text-sm text-foreground outline-none transition focus:border-primary/45 focus:bg-background/70 focus:ring-2 focus:ring-primary/10";

function makeDefaultFilterDraft(channelOptions = fallbackChannels): FilterDraft {
  return {
    channels: channelOptions.map((channel) => channel.key),
    excludeCancelled: false,
    metric: "Active GMV",
    status: "All",
    start: "",
    end: "",
    regionalManager: "All",
    areaManager: "All",
    province: "All",
    city: "All",
    skuType: "All",
  };
}

function readChannels(searchParams: URLSearchParams, channelOptions = fallbackChannels) {
  const value = searchParams.get("channels");
  return value ? value.split(",").filter(Boolean) : channelOptions.map((channel) => channel.key);
}

function normalizeChannels(value: string[], channelOptions = fallbackChannels) {
  const knownKeys = channelOptions.map((channel) => channel.key);
  const selected = knownKeys.filter((key) => value.includes(key));
  return selected.length ? selected : knownKeys;
}

function readFilterDraft(searchParams: URLSearchParams, channelOptions = fallbackChannels): FilterDraft {
  const defaults = makeDefaultFilterDraft(channelOptions);

  return {
    channels: normalizeChannels(readChannels(searchParams, channelOptions), channelOptions),
    excludeCancelled: searchParams.get("excludeCancelled") === "true",
    metric: searchParams.get("metric") ?? defaults.metric,
    status: searchParams.get("status") ?? defaults.status,
    start: searchParams.get("start") ?? defaults.start,
    end: searchParams.get("end") ?? defaults.end,
    regionalManager: searchParams.get("regionalManager") ?? defaults.regionalManager,
    areaManager: searchParams.get("areaManager") ?? defaults.areaManager,
    province: searchParams.get("province") ?? defaults.province,
    city: searchParams.get("city") ?? defaults.city,
    skuType: searchParams.get("skuType") ?? defaults.skuType,
  };
}

function draftToSearchParams(draft: FilterDraft, channelOptions = fallbackChannels) {
  const defaults = makeDefaultFilterDraft(channelOptions);
  const next = new URLSearchParams();
  const selectedChannels = normalizeChannels(draft.channels, channelOptions);

  if (selectedChannels.length < channelOptions.length) next.set("channels", selectedChannels.join(","));
  if (draft.excludeCancelled) next.set("excludeCancelled", "true");
  if (draft.metric !== defaults.metric) next.set("metric", draft.metric);
  if (draft.status !== defaults.status) next.set("status", draft.status);
  if (draft.start && draft.start !== defaults.start) next.set("start", draft.start);
  if (draft.end && draft.end !== defaults.end) next.set("end", draft.end);
  if (draft.regionalManager !== defaults.regionalManager) next.set("regionalManager", draft.regionalManager);
  if (draft.areaManager !== defaults.areaManager) next.set("areaManager", draft.areaManager);
  if (draft.province !== defaults.province) next.set("province", draft.province);
  if (draft.city !== defaults.city) next.set("city", draft.city);
  if (draft.skuType !== defaults.skuType) next.set("skuType", draft.skuType);

  return next;
}

function draftToRouteSearchParams(draft: FilterDraft, channelOptions = fallbackChannels, options: { forceChannels?: boolean } = {}) {
  const next = draftToSearchParams(draft, channelOptions);
  const selectedChannels = normalizeChannels(draft.channels, channelOptions);

  if (options.forceChannels) {
    next.set("channels", selectedChannels.join(","));
  }

  return next;
}

function draftKey(draft: FilterDraft, channelOptions = fallbackChannels) {
  return draftToSearchParams(draft, channelOptions).toString();
}

function activeFilterCount(draft: FilterDraft, channelOptions = fallbackChannels) {
  const defaults = makeDefaultFilterDraft(channelOptions);

  return (
    (normalizeChannels(draft.channels, channelOptions).length < channelOptions.length ? 1 : 0) +
    (draft.excludeCancelled ? 1 : 0) +
    (draft.metric !== defaults.metric ? 1 : 0) +
    (draft.status !== defaults.status ? 1 : 0) +
    (draft.start ? 1 : 0) +
    (draft.end ? 1 : 0) +
    (draft.regionalManager !== defaults.regionalManager ? 1 : 0) +
    (draft.areaManager !== defaults.areaManager ? 1 : 0) +
    (draft.province !== defaults.province ? 1 : 0) +
    (draft.city !== defaults.city ? 1 : 0) +
    (draft.skuType !== defaults.skuType ? 1 : 0)
  );
}

function channelSummary(draft: FilterDraft, channelOptions = fallbackChannels) {
  const selected = normalizeChannels(draft.channels, channelOptions);
  if (selected.length === channelOptions.length) return "All channels";
  return `${selected.length} of ${channelOptions.length} channels`;
}

function periodSummary(draft: FilterDraft) {
  if (draft.start && draft.end) return `${draft.start} to ${draft.end}`;
  if (draft.start) return `From ${draft.start}`;
  if (draft.end) return `Until ${draft.end}`;
  return "All available dates";
}

function selectOptions(values: string[], selectedValue: string) {
  const options = ["All", ...values.filter((value) => value && value !== "All")];
  if (selectedValue !== "All" && !options.includes(selectedValue)) {
    options.splice(1, 0, selectedValue);
  }
  return options;
}

function mergeChannelOptions(channelOptions: DashboardFilterOptions["channels"], selectedKeys: string[]) {
  const channels = channelOptions.length ? channelOptions : fallbackChannels;
  const missing = selectedKeys
    .filter((key) => !channels.some((channel) => channel.key === key))
    .map((key) => ({ key, name: key }));

  return [...channels, ...missing];
}

function FilterField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border bg-muted/30 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5 text-foreground">{title}</h3>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-[8px] border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

export function GlobalFilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const { allowedChannels } = useDashboardAccess();
  const isMarketplaceScope = pathname === "/marketplace";
  const [searchKey, setSearchKey] = useState(() =>
    typeof window === "undefined" ? "" : window.location.search.slice(1),
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions>(fallbackFilterOptions);
  const [isFilterOptionsLoading, setIsFilterOptionsLoading] = useState(true);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);
  const channelOptions = useMemo(() => {
    const allowedKeys = new Set<string>(allowedChannels.map((channel) => channel.key));
    const available = (filterOptions.channels.length ? filterOptions.channels : allowedChannels).filter((channel) =>
      allowedKeys.has(channel.key),
    );
    const scopedAvailable = available.length ? available : allowedChannels;
    if (!isMarketplaceScope) return scopedAvailable;

    const marketplaceChannels = scopedAvailable.filter((channel) => marketplaceChannelKeys.has(channel.key));
    return marketplaceChannels.length ? marketplaceChannels : marketplaceFallbackChannels;
  }, [allowedChannels, filterOptions.channels, isMarketplaceScope]);
  const appliedFilters = useMemo(
    () => {
      const next = readFilterDraft(new URLSearchParams(searchKey), channelOptions);
      return isMarketplaceScope ? { ...next, regionalManager: "All", areaManager: "All" } : next;
    },
    [channelOptions, isMarketplaceScope, searchKey],
  );
  const [draftState, setDraftState] = useState(() => ({ filters: appliedFilters, sourceKey: searchKey }));
  const draftFilters = draftState.sourceKey === searchKey ? draftState.filters : appliedFilters;
  const activeCount = activeFilterCount(appliedFilters, channelOptions);
  const draftActiveCount = activeFilterCount(draftFilters, channelOptions);
  const hasPendingChanges = draftKey(draftFilters, channelOptions) !== draftKey(appliedFilters, channelOptions);
  const channelChoices = useMemo(
    () => mergeChannelOptions(channelOptions, draftFilters.channels),
    [channelOptions, draftFilters.channels],
  );
  const statusOptions = useMemo(
    () => selectOptions(filterOptions.statuses, draftFilters.status),
    [draftFilters.status, filterOptions.statuses],
  );
  const regionalManagerOptions = useMemo(
    () => selectOptions(filterOptions.regionalManagers, draftFilters.regionalManager),
    [draftFilters.regionalManager, filterOptions.regionalManagers],
  );
  const areaManagerOptions = useMemo(
    () => selectOptions(filterOptions.areaManagers, draftFilters.areaManager),
    [draftFilters.areaManager, filterOptions.areaManagers],
  );
  const provinceOptions = useMemo(
    () => selectOptions(filterOptions.provinces, draftFilters.province),
    [draftFilters.province, filterOptions.provinces],
  );
  const cityOptions = useMemo(
    () => selectOptions(filterOptions.cities, draftFilters.city),
    [draftFilters.city, filterOptions.cities],
  );
  const skuTypeOptions = useMemo(
    () => selectOptions(filterOptions.skuTypes, draftFilters.skuType),
    [draftFilters.skuType, filterOptions.skuTypes],
  );

  useEffect(() => {
    const readCurrentSearch = () => setSearchKey(window.location.search.slice(1));
    const handleFilterChange = (event: Event) => {
      const query =
        event instanceof CustomEvent && typeof event.detail?.query === "string"
          ? event.detail.query
          : window.location.search.slice(1);
      setSearchKey(query);
    };

    window.addEventListener("popstate", readCurrentSearch);
    window.addEventListener("dashboard-filter-change", handleFilterChange);

    return () => {
      window.removeEventListener("popstate", readCurrentSearch);
      window.removeEventListener("dashboard-filter-change", handleFilterChange);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchKey(window.location.search.slice(1)), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    async function loadFilterOptions() {
      controller?.abort();
      controller = new AbortController();
      setIsFilterOptionsLoading(true);
      setFilterOptionsError(null);

      try {
        const response = await fetch("/api/analytics/filter-options", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          ok: boolean;
          data?: DashboardFilterOptions;
          error?: { message?: string };
        };

        if (!payload.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "Failed to load filter options");
        }

        if (!cancelled) {
          setFilterOptions({
            ...fallbackFilterOptions,
            ...payload.data,
            channels: payload.data.channels.length ? payload.data.channels : allowedChannels,
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!cancelled) {
          setFilterOptionsError(error instanceof Error ? error.message : "Failed to load filter options");
        }
      } finally {
        if (!cancelled) setIsFilterOptionsLoading(false);
      }
    }

    loadFilterOptions();
    window.addEventListener("dashboard-filter-options-refresh", loadFilterOptions);

    return () => {
      cancelled = true;
      controller?.abort();
      window.removeEventListener("dashboard-filter-options-refresh", loadFilterOptions);
    };
  }, [allowedChannels]);

  useEffect(() => {
    function handleLoading(event: Event) {
      if (event instanceof CustomEvent && event.detail?.loading === false) {
        setIsApplying(false);
      }
    }

    window.addEventListener("dashboard-data-loading", handleLoading);
    return () => window.removeEventListener("dashboard-data-loading", handleLoading);
  }, []);

  useEffect(() => {
    const openPanel = () => setIsExpanded(true);
    const togglePanel = () => setIsExpanded((current) => !current);
    const closePanel = () => setIsExpanded(false);

    window.addEventListener("dashboard-filter-panel-open", openPanel);
    window.addEventListener("dashboard-filter-panel-toggle", togglePanel);
    window.addEventListener("dashboard-filter-panel-close", closePanel);

    return () => {
      window.removeEventListener("dashboard-filter-panel-open", openPanel);
      window.removeEventListener("dashboard-filter-panel-toggle", togglePanel);
      window.removeEventListener("dashboard-filter-panel-close", closePanel);
    };
  }, []);

  function updateDraft(updater: (current: FilterDraft) => FilterDraft) {
    setDraftState((current) => {
      const currentFilters = current.sourceKey === searchKey ? current.filters : appliedFilters;
      return { filters: updater(currentFilters), sourceKey: searchKey };
    });
  }

  function commitFilters(nextDraft: FilterDraft) {
    const scopedDraft = isMarketplaceScope ? { ...nextDraft, regionalManager: "All", areaManager: "All" } : nextDraft;
    const next = draftToRouteSearchParams(scopedDraft, channelOptions, { forceChannels: isMarketplaceScope });
    const nextQuery = next.toString();

    if (nextQuery === searchKey) {
      setIsApplying(false);
      return;
    }

    setIsApplying(true);
    setSearchKey(nextQuery);
    router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
    window.dispatchEvent(new CustomEvent("dashboard-filter-change", { detail: { query: nextQuery } }));
  }

  function resetFilters() {
    const resetDraft = makeDefaultFilterDraft(channelOptions);
    setDraftState({ filters: resetDraft, sourceKey: searchKey });
    commitFilters(resetDraft);
  }

  const exportQuery = useMemo(() => {
    const query = new URLSearchParams(searchKey);
    if (isMarketplaceScope && !query.has("channels")) {
      query.set("channels", channelOptions.map((channel) => channel.key).join(","));
    }
    if (appliedFilters.excludeCancelled) query.set("excludeCancelled", "true");
    return query.toString();
  }, [appliedFilters.excludeCancelled, channelOptions, isMarketplaceScope, searchKey]);

  const filterTitle = isMarketplaceScope ? "Marketplace Filters" : "Global Filters";
  const channelSectionTitle = isMarketplaceScope ? "Marketplace Sources" : "Channels";
  const businessScopeTitle = isMarketplaceScope ? "Marketplace Scope" : "Business Scope";
  const businessScopeDescription = isMarketplaceScope
    ? "Saring data marketplace berdasarkan wilayah penerima dan tipe SKU."
    : "Saring data berdasarkan ownership, wilayah, dan tipe SKU.";

  if (!isExpanded) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-[8px] border border-border/90 bg-card shadow-sm shadow-black/10">
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="flex w-full flex-col gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{filterTitle}</span>
              {activeCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
              {hasPendingChanges && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Pending
                </span>
              )}
              {isFilterOptionsLoading && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Syncing options
                </span>
              )}
              {filterOptionsError && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Fallback options
                </span>
              )}
            </div>
            <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
              <SummaryPill label="Period" value={periodSummary(appliedFilters)} />
              <SummaryPill label="Metric" value={appliedFilters.metric} />
              <SummaryPill label="Channel" value={channelSummary(appliedFilters, channelOptions)} />
              <SummaryPill label="Status" value={appliedFilters.status} />
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:ml-3",
            "rotate-180",
          )}
        />
      </button>

      <div className="border-t border-border bg-background/20 p-4">
          {hasPendingChanges && (
            <div className="mb-4 rounded-[8px] border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              Draft filter belum diterapkan. Klik <span className="font-semibold">Proses Filter</span> untuk memperbarui seluruh dashboard.
            </div>
          )}

          {filterOptionsError && (
            <div className="mb-4 rounded-[8px] border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              Opsi filter dinamis belum tersedia. Panel sementara memakai fallback sampai sinkronisasi berikutnya berhasil.
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <section className="rounded-[8px] border border-border bg-card/70 p-4">
              <SectionHeader
                icon={<Calendar className="h-4 w-4" />}
                title="Time & Metric"
                description="Atur periode, metric utama, status order, dan perlakuan cancel."
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <FilterField label="Start" icon={<Calendar className="h-3.5 w-3.5" />}>
                  <input
                    type="date"
                    value={draftFilters.start}
                    onChange={(event) => updateDraft((current) => ({ ...current, start: event.target.value }))}
                    className={inputClassName}
                  />
                </FilterField>

                <FilterField label="End" icon={<Calendar className="h-3.5 w-3.5" />}>
                  <input
                    type="date"
                    value={draftFilters.end}
                    onChange={(event) => updateDraft((current) => ({ ...current, end: event.target.value }))}
                    className={inputClassName}
                  />
                </FilterField>

                <FilterField label="Metric" icon={<BarChart3 className="h-3.5 w-3.5" />}>
                  <select
                    value={draftFilters.metric}
                    onChange={(event) => updateDraft((current) => ({ ...current, metric: event.target.value }))}
                    className={inputClassName}
                  >
                    {metrics.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Status">
                  <select
                    value={draftFilters.status}
                    onChange={(event) => updateDraft((current) => ({ ...current, status: event.target.value }))}
                    className={inputClassName}
                  >
                    {statusOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Cancelled">
                  <button
                    type="button"
                    onClick={() => updateDraft((current) => ({ ...current, excludeCancelled: !current.excludeCancelled }))}
                    className={cn(
                      "flex h-10 w-full items-center justify-between gap-2 rounded-[8px] border px-3 text-sm transition",
                      draftFilters.excludeCancelled
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border bg-background/40 text-foreground hover:bg-muted/30",
                    )}
                  >
                    <span>{draftFilters.excludeCancelled ? "Excluded" : "Included"}</span>
                    {draftFilters.excludeCancelled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </button>
                </FilterField>
              </div>
            </section>

            <section className="rounded-[8px] border border-border bg-card/70 p-4">
              <SectionHeader
                icon={<Users className="h-4 w-4" />}
                title={businessScopeTitle}
                description={businessScopeDescription}
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {!isMarketplaceScope && (
                  <>
                    <FilterField label="Regional Manager" icon={<Users className="h-3.5 w-3.5" />}>
                      <select
                        value={draftFilters.regionalManager}
                        onChange={(event) => updateDraft((current) => ({ ...current, regionalManager: event.target.value }))}
                        className={inputClassName}
                      >
                        {regionalManagerOptions.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </FilterField>

                    <FilterField label="Area Manager" icon={<Users className="h-3.5 w-3.5" />}>
                      <select
                        value={draftFilters.areaManager}
                        onChange={(event) => updateDraft((current) => ({ ...current, areaManager: event.target.value }))}
                        className={inputClassName}
                      >
                        {areaManagerOptions.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </FilterField>
                  </>
                )}

                <FilterField label="Province" icon={<MapPin className="h-3.5 w-3.5" />}>
                  <select
                    value={draftFilters.province}
                    onChange={(event) => updateDraft((current) => ({ ...current, province: event.target.value }))}
                    className={inputClassName}
                  >
                    {provinceOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="City" icon={<MapPin className="h-3.5 w-3.5" />}>
                  <select
                    value={draftFilters.city}
                    onChange={(event) => updateDraft((current) => ({ ...current, city: event.target.value }))}
                    className={inputClassName}
                  >
                    {cityOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="SKU Type" icon={<Package className="h-3.5 w-3.5" />}>
                  <select
                    value={draftFilters.skuType}
                    onChange={(event) => updateDraft((current) => ({ ...current, skuType: event.target.value }))}
                    className={inputClassName}
                  >
                    {skuTypeOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </FilterField>
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-[8px] border border-border bg-card/70 p-4">
            <SectionHeader
              icon={<Filter className="h-4 w-4" />}
              title={channelSectionTitle}
              description="Pilih channel yang masuk ke perhitungan setelah filter diproses."
            />
            <div className={cn("grid gap-2 sm:grid-cols-2", isMarketplaceScope ? "lg:grid-cols-3" : "lg:grid-cols-5")}>
              {channelChoices.map((channel) => {
                const isSelected = draftFilters.channels.includes(channel.key);
                return (
                  <button
                    key={channel.key}
                    type="button"
                    onClick={() => {
                      const next = isSelected
                        ? draftFilters.channels.filter((key) => key !== channel.key)
                        : [...draftFilters.channels, channel.key];

                      if (!next.length) return;
                      updateDraft((current) => ({ ...current, channels: normalizeChannels(next, channelOptions) }));
                    }}
                    className={cn(
                      "flex h-10 items-center justify-between gap-2 rounded-[8px] border px-3 text-left text-xs font-medium transition",
                      isSelected
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{channel.name}</span>
                    {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-40" />}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-4 rounded-[8px] border border-border bg-card/80 p-3">
            <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <button
                type="button"
                onClick={resetFilters}
                disabled={isApplying}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-border bg-background/40 px-4 text-xs font-semibold text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filter
              </button>

              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground lg:justify-center">
                <span className="font-medium text-foreground">
                  {hasPendingChanges
                    ? isApplying
                      ? "Loading filtered data..."
                      : `${draftActiveCount} draft filter${draftActiveCount === 1 ? "" : "s"} ready`
                    : "No pending filter changes"}
                </span>
                <span className="hidden sm:inline">|</span>
                <span>Export applied filter:</span>
                <a
                  href={`/api/exports/cleaned${exportQuery ? `?${exportQuery}` : ""}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-muted/20 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  <Download className="h-3 w-3" /> CSV
                </a>
                <a
                  href={`/api/exports/cleaned?${exportQuery ? `${exportQuery}&` : ""}format=xlsx`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-muted/20 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  <Download className="h-3 w-3" /> XLSX
                </a>
              </div>

              <button
                type="button"
                onClick={() => commitFilters(draftFilters)}
                disabled={!hasPendingChanges || isApplying}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-5 text-xs font-semibold transition",
                  hasPendingChanges && !isApplying
                    ? "border border-primary/40 bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
                    : "cursor-not-allowed border border-border bg-muted/30 text-muted-foreground",
                )}
              >
                {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {isApplying ? "Memproses..." : "Proses Filter"}
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}
