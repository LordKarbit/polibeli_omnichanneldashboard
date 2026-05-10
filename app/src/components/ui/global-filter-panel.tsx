"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

import { cn } from "@/lib/utils";

const channels = [
  { key: "gt", name: "GT" },
  { key: "mt", name: "MT" },
  { key: "shopee", name: "Shopee" },
  { key: "tiktok1", name: "TikTok Shop (Kayou ID)" },
  { key: "tiktok2", name: "TikTok Shop (Kayou Card ID)" },
];

const metrics = ["Active GMV", "Booked GMV", "Refund", "Quantity", "Orders", "AOV"];
const statuses = ["All", "completed", "shipped", "cancelled", "pending"];
const regionalManagers = ["All", "Nur Setyo Aji", "Hakim Abdul Aziz"];
const areaManagers = [
  "All",
  "Riky Marojahan Hasibuan",
  "Wahyu Kusuma Nugroho",
  "Nur Setyo Aji",
  "Pungguh Ikhsan Priyombodo",
  "Lamsihar Sitorus",
  "Muliyawarman Muchtar",
  "Yoppi Dwi Ariesanto",
  "Agency",
];
const provinces = ["All", "DKI Jakarta", "Jawa Timur", "Jawa Barat", "Jawa Tengah", "Bali", "Other"];
const skuTypes = ["All", "paid_product", "bundle", "free_gift", "posm"];

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
  skuType: string;
};

const defaultFilterDraft: FilterDraft = {
  channels: channels.map((channel) => channel.key),
  excludeCancelled: false,
  metric: "Active GMV",
  status: "All",
  start: "2026-04-01",
  end: "2026-04-30",
  regionalManager: "All",
  areaManager: "All",
  province: "All",
  skuType: "All",
};

const inputClassName =
  "h-10 w-full rounded-[8px] border border-border bg-background/40 px-3 text-sm text-foreground outline-none transition focus:border-primary/45 focus:bg-background/70 focus:ring-2 focus:ring-primary/10";

function readChannels(searchParams: URLSearchParams) {
  const value = searchParams.get("channels");
  return value ? value.split(",").filter(Boolean) : channels.map((channel) => channel.key);
}

function normalizeChannels(value: string[]) {
  const knownKeys = channels.map((channel) => channel.key);
  const selected = knownKeys.filter((key) => value.includes(key));
  return selected.length ? selected : knownKeys;
}

function readFilterDraft(searchParams: URLSearchParams): FilterDraft {
  return {
    channels: normalizeChannels(readChannels(searchParams)),
    excludeCancelled: searchParams.get("excludeCancelled") === "true",
    metric: searchParams.get("metric") ?? defaultFilterDraft.metric,
    status: searchParams.get("status") ?? defaultFilterDraft.status,
    start: searchParams.get("start") ?? defaultFilterDraft.start,
    end: searchParams.get("end") ?? defaultFilterDraft.end,
    regionalManager: searchParams.get("regionalManager") ?? defaultFilterDraft.regionalManager,
    areaManager: searchParams.get("areaManager") ?? defaultFilterDraft.areaManager,
    province: searchParams.get("province") ?? defaultFilterDraft.province,
    skuType: searchParams.get("skuType") ?? defaultFilterDraft.skuType,
  };
}

function draftToSearchParams(draft: FilterDraft) {
  const next = new URLSearchParams();
  const selectedChannels = normalizeChannels(draft.channels);

  if (selectedChannels.length < channels.length) next.set("channels", selectedChannels.join(","));
  if (draft.excludeCancelled) next.set("excludeCancelled", "true");
  if (draft.metric !== defaultFilterDraft.metric) next.set("metric", draft.metric);
  if (draft.status !== defaultFilterDraft.status) next.set("status", draft.status);
  if (draft.start && draft.start !== defaultFilterDraft.start) next.set("start", draft.start);
  if (draft.end && draft.end !== defaultFilterDraft.end) next.set("end", draft.end);
  if (draft.regionalManager !== defaultFilterDraft.regionalManager) next.set("regionalManager", draft.regionalManager);
  if (draft.areaManager !== defaultFilterDraft.areaManager) next.set("areaManager", draft.areaManager);
  if (draft.province !== defaultFilterDraft.province) next.set("province", draft.province);
  if (draft.skuType !== defaultFilterDraft.skuType) next.set("skuType", draft.skuType);

  return next;
}

function draftKey(draft: FilterDraft) {
  return draftToSearchParams(draft).toString();
}

function activeFilterCount(draft: FilterDraft) {
  return (
    (normalizeChannels(draft.channels).length < channels.length ? 1 : 0) +
    (draft.excludeCancelled ? 1 : 0) +
    (draft.metric !== defaultFilterDraft.metric ? 1 : 0) +
    (draft.status !== defaultFilterDraft.status ? 1 : 0) +
    (draft.regionalManager !== defaultFilterDraft.regionalManager ? 1 : 0) +
    (draft.areaManager !== defaultFilterDraft.areaManager ? 1 : 0) +
    (draft.province !== defaultFilterDraft.province ? 1 : 0) +
    (draft.skuType !== defaultFilterDraft.skuType ? 1 : 0)
  );
}

function channelSummary(draft: FilterDraft) {
  const selected = normalizeChannels(draft.channels);
  if (selected.length === channels.length) return "All channels";
  return `${selected.length} of ${channels.length} channels`;
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
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const appliedFilters = useMemo(() => readFilterDraft(new URLSearchParams(searchKey)), [searchKey]);
  const [draftState, setDraftState] = useState(() => ({ filters: appliedFilters, sourceKey: searchKey }));
  const draftFilters = draftState.sourceKey === searchKey ? draftState.filters : appliedFilters;
  const activeCount = activeFilterCount(appliedFilters);
  const draftActiveCount = activeFilterCount(draftFilters);
  const hasPendingChanges = draftKey(draftFilters) !== draftKey(appliedFilters);

  useEffect(() => {
    function handleLoading(event: Event) {
      if (event instanceof CustomEvent && event.detail?.loading === false) {
        setIsApplying(false);
      }
    }

    window.addEventListener("dashboard-data-loading", handleLoading);
    return () => window.removeEventListener("dashboard-data-loading", handleLoading);
  }, []);

  function updateDraft(updater: (current: FilterDraft) => FilterDraft) {
    setDraftState((current) => {
      const currentFilters = current.sourceKey === searchKey ? current.filters : appliedFilters;
      return { filters: updater(currentFilters), sourceKey: searchKey };
    });
  }

  function commitFilters(nextDraft: FilterDraft) {
    const next = draftToSearchParams(nextDraft);
    const nextQuery = next.toString();

    if (nextQuery === searchKey) {
      setIsApplying(false);
      return;
    }

    setIsApplying(true);
    router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
    window.dispatchEvent(new CustomEvent("dashboard-filter-change", { detail: { query: nextQuery } }));
  }

  function resetFilters() {
    setDraftState({ filters: defaultFilterDraft, sourceKey: searchKey });
    commitFilters(defaultFilterDraft);
  }

  const exportQuery = useMemo(() => {
    const query = new URLSearchParams(searchKey);
    if (appliedFilters.excludeCancelled) query.set("excludeCancelled", "true");
    return query.toString();
  }, [appliedFilters.excludeCancelled, searchKey]);

  return (
    <div className="mb-4 overflow-hidden rounded-[8px] border border-border/90 bg-card shadow-sm shadow-black/10">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full flex-col gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Global Filters</span>
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
            </div>
            <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
              <SummaryPill label="Period" value={`${appliedFilters.start} to ${appliedFilters.end}`} />
              <SummaryPill label="Metric" value={appliedFilters.metric} />
              <SummaryPill label="Channel" value={channelSummary(appliedFilters)} />
              <SummaryPill label="Status" value={appliedFilters.status} />
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:ml-3",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-background/20 p-4">
          {hasPendingChanges && (
            <div className="mb-4 rounded-[8px] border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              Draft filter belum diterapkan. Klik <span className="font-semibold">Proses Filter</span> untuk memperbarui seluruh dashboard.
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
                    {statuses.map((item) => (
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
                title="Business Scope"
                description="Saring data berdasarkan ownership, wilayah, dan tipe SKU."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FilterField label="Regional Manager" icon={<Users className="h-3.5 w-3.5" />}>
                  <select
                    value={draftFilters.regionalManager}
                    onChange={(event) => updateDraft((current) => ({ ...current, regionalManager: event.target.value }))}
                    className={inputClassName}
                  >
                    {regionalManagers.map((item) => (
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
                    {areaManagers.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Province" icon={<MapPin className="h-3.5 w-3.5" />}>
                  <select
                    value={draftFilters.province}
                    onChange={(event) => updateDraft((current) => ({ ...current, province: event.target.value }))}
                    className={inputClassName}
                  >
                    {provinces.map((item) => (
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
                    {skuTypes.map((item) => (
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
              title="Channels"
              description="Pilih channel yang masuk ke perhitungan setelah filter diproses."
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {channels.map((channel) => {
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
                      updateDraft((current) => ({ ...current, channels: normalizeChannels(next) }));
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
      )}
    </div>
  );
}
