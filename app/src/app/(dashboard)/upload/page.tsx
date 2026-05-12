"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Database, FileSpreadsheet, Loader2, Trash2, Upload } from "lucide-react";

import { ChartCard } from "@/components/ui/chart-card";
import { Badge } from "@/components/ui/badge";
import { clearDashboardDataCache, useDashboardData } from "@/lib/dashboard-client";
import { cn } from "@/lib/utils";
import { abbreviateIDR, formatIDR } from "@/lib/format";

const sourceOptions = [
  { value: "b2b", label: "B2B GT/MT", description: "raw_dashboard CSV export", color: "#06b6d4" },
  { value: "shopee", label: "Shopee", description: "Order.all / Income", color: "#f97316" },
  { value: "tiktok1", label: "TikTok Shop (Kayou ID)", description: "All Order / Income", color: "#ef4444" },
  { value: "tiktok2", label: "TikTok Shop (Kayou Card ID)", description: "All Order / Income", color: "#ec4899" },
];

const marketplaceFileTypes = [
  {
    value: "orders",
    label: "Order File",
    description: "Transaksi, SKU, customer, lokasi, status",
  },
  {
    value: "income",
    label: "Income / Released",
    description: "Released Amount dari laporan income",
  },
];

const processingSteps = [
  ["Upload", "Original file stored and hashed"],
  ["Parse", "Excel/CSV rows converted to raw payloads"],
  ["Normalize", "Orders, items, locations, products, customers unified"],
  ["Deduplicate", "Order metrics deduped by source + shop + order ID"],
  ["Aggregate", "Dashboard-ready metrics refreshed"],
];

async function readApiPayload<TData = unknown>(response: Response, fallbackMessage: string) {
  const text = await response.text();
  let payload: { ok?: boolean; data?: TData; error?: { message?: string } };

  try {
    payload = JSON.parse(text);
  } catch {
    const preview = text.trim().replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
      response.ok
        ? `${fallbackMessage}: server returned a non-JSON response.`
        : `${fallbackMessage}: API returned HTTP ${response.status}. ${preview || "No response body."}`,
    );
  }

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error?.message ?? `${fallbackMessage}: API returned HTTP ${response.status}`);
  }

  return payload as { ok: true; data: TData };
}

function statusIcon(status: string) {
  if (status.includes("warning")) return <AlertCircle className="h-4 w-4 text-amber-500" />;
  if (status.includes("pending") || status.includes("processing")) return <Clock className="h-4 w-4 animate-spin text-amber-500" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSource, setSelectedSource] = useState("b2b");
  const [selectedMarketplaceFileType, setSelectedMarketplaceFileType] = useState<"orders" | "income">("orders");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, isLoading } = useDashboardData(refreshKey);

  async function uploadFiles(files: FileList | File[], replace = true) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    setIsProcessing(true);
    setMessage(null);

    try {
      const isMarketplaceIncomeSource = selectedSource === "shopee" || selectedSource === "tiktok1" || selectedSource === "tiktok2";
      const sourceHint = isMarketplaceIncomeSource && selectedMarketplaceFileType === "income" ? `${selectedSource}_income` : selectedSource;
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.set("sourceHint", sourceHint);
      formData.set("replace", String(replace));

      const response = await fetch("/api/ingest/files", {
        method: "POST",
        body: formData,
      });
      const payload = await readApiPayload<{
        totalFiles: number;
        totalRawRows: number;
        totalNormalizedOrders: number;
        totalReleasedAmount?: number;
        incomeSnapshots?: Array<{ shopAccount?: string; releasedAmount?: number; periodStart?: string; periodEnd?: string }>;
      }>(response, "Upload failed");

      if (isMarketplaceIncomeSource && selectedMarketplaceFileType === "income") {
        const releasedAmount = payload.data.totalReleasedAmount ?? 0;
        const sourceLabel = selectedSource === "shopee" ? "Shopee" : "TikTok";
        setMessage(`Processed ${payload.data.totalFiles} ${sourceLabel} income file(s). Released Amount ${formatIDR(releasedAmount)} has replaced the previous released value for this account.`);
      } else {
        setMessage(`Processed ${payload.data.totalFiles} file(s), ${payload.data.totalRawRows.toLocaleString("id-ID")} rows, ${payload.data.totalNormalizedOrders.toLocaleString("id-ID")} deduped orders. Previous data for this channel was replaced.`);
      }
      clearDashboardDataCache();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function wipeData() {
    const confirmed = window.confirm(
      "Hapus semua data dashboard saat ini? Setelah data dihapus, dashboard akan kosong sampai file baru diupload.",
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/ingest/wipe", { method: "POST" });
      await readApiPayload(response, "Wipe data failed");

      setMessage("All dashboard data has been wiped. You can upload fresh channel files now.");
      clearDashboardDataCache();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wipe data failed");
    } finally {
      setIsProcessing(false);
    }
  }

  const gt = data?.channels.find((channel) => channel.channelKey === "gt");
  const mt = data?.channels.find((channel) => channel.channelKey === "mt");
  const shopee = data?.channels.find((channel) => channel.channelKey === "shopee");
  const tiktokId = data?.channels.find((channel) => channel.channelKey === "tiktok1");
  const tiktokCard = data?.channels.find((channel) => channel.channelKey === "tiktok2");
  const isMarketplaceIncomeSelected = selectedSource === "shopee" || selectedSource === "tiktok1" || selectedSource === "tiktok2";

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div
          className={cn(
            "col-span-2 rounded-xl border-2 border-dashed bg-card p-8 transition-all",
            isDragging ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-border hover:border-primary/30",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            uploadFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(event) => event.target.files && uploadFiles(event.target.files)}
          />

          <div className="flex flex-col items-center gap-4 text-center">
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl transition-colors", isDragging ? "scale-110 bg-primary/20" : "bg-primary/10")}>
              {isProcessing ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-primary" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Upload Raw Data Files</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload one file per channel. New B2B GT/MT, Shopee, TikTok ID, or TikTok Card files automatically replace the previous data for that selected channel.
              </p>
            </div>

            <div className="mt-4 grid w-full grid-cols-2 gap-3 md:grid-cols-4">
              {sourceOptions.map((source) => (
                <button
                  key={source.value}
                  onClick={() => {
                    setSelectedSource(source.value);
                    if (source.value === "b2b") setSelectedMarketplaceFileType("orders");
                  }}
                  className={cn(
                    "group flex min-h-[116px] flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:bg-primary/5",
                    selectedSource === source.value ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-muted/30 hover:border-primary/30",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background" style={{ border: `1px solid ${source.color}30` }}>
                    <FileSpreadsheet className="h-5 w-5" style={{ color: source.color }} />
                  </div>
                  <span className={cn("text-xs font-semibold", selectedSource === source.value ? "text-primary" : "text-foreground")}>{source.label}</span>
                  <span className="text-center text-[10px] leading-4 text-muted-foreground">{source.description}</span>
                </button>
              ))}
            </div>

            {isMarketplaceIncomeSelected && (
              <div className="w-full rounded-xl border border-border bg-muted/20 p-3 text-left">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Marketplace upload type</p>
                    <p className="text-xs text-muted-foreground">Pilih order file untuk transaksi, atau income file untuk Released Amount.</p>
                  </div>
                  <Badge variant="secondary" className="w-fit text-xs">
                    {selectedSource === "shopee" ? "Shopee" : selectedSource === "tiktok1" ? "Kayou ID" : "Kayou Card ID"}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {marketplaceFileTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedMarketplaceFileType(type.value as "orders" | "income")}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-left transition-colors",
                        selectedMarketplaceFileType === type.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background/50 text-foreground hover:border-primary/30 hover:bg-primary/5",
                      )}
                    >
                      <span className="block text-sm font-semibold">
                        {type.value === "orders" ? (selectedSource === "shopee" ? "Order.all" : "All Order") : type.label}
                      </span>
                      <span className="mt-1 block text-xs leading-4 text-muted-foreground">{type.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Select Files
              </button>
              <button
                onClick={wipeData}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/35 bg-destructive/10 px-6 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Wipe Data
              </button>
            </div>

            {message && (
              <div className={cn("mt-2 rounded-lg border px-4 py-2 text-sm", message.includes("failed") || message.includes("gagal") ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300")}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Database className="h-4 w-4 text-primary" />
            Processing Pipeline
          </h3>
          <div className="relative flex-1">
            <div className="absolute bottom-4 left-3 top-2 w-px bg-border" />
            <div className="relative space-y-4">
              {processingSteps.map(([step, description], index) => (
                <div key={step} className="flex gap-4">
                  <div className={cn("relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-card", isProcessing && index === 1 ? "bg-amber-500/20" : "bg-emerald-500/20")}>
                    {isProcessing && index === 1 ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium text-foreground">{step}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Files Processed</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{data?.uploads.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Total Line Items</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{(data?.summary.lineItems ?? 0).toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">B2B GMV from SKUGMV</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{abbreviateIDR((gt?.bookedGMV ?? 0) + (mt?.bookedGMV ?? 0))}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">GT / MT Split</p>
          <p className="mt-2 text-sm font-semibold text-foreground">GT {abbreviateIDR(gt?.bookedGMV ?? 0)} · MT {abbreviateIDR(mt?.bookedGMV ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Shopee Released Amount</p>
          <p className="mt-2 text-xl font-bold text-foreground">{formatIDR(shopee?.gmvPayment ?? 0)}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Selesai + Waktu Pesanan Selesai, deduped by No. Pesanan.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 md:col-span-2 xl:col-span-1">
          <p className="text-xs text-muted-foreground">TikTok Released Amount</p>
          <p className="mt-2 text-xl font-bold text-foreground">{formatIDR((tiktokId?.gmvPayment ?? 0) + (tiktokCard?.gmvPayment ?? 0))}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Income Reports, split by TikTok account.</p>
        </div>
      </div>

      <ChartCard title="Recent Uploads" subtitle="Upload history, schema detection, and processing status">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">File Name</th>
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3 pr-4 text-right">Rows</th>
                <th className="pb-3 pr-4 text-right">Columns</th>
                <th className="pb-3 text-right">Issues</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Loading upload history...</td>
                </tr>
              )}
              {data?.uploads.map((upload) => (
                <tr key={upload.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="py-3 pr-4">{statusIcon(upload.status)}</td>
                  <td className="max-w-[300px] truncate py-3 pr-4 font-medium text-foreground" title={upload.fileName}>{upload.fileName}</td>
                  <td className="py-3 pr-4">
                    <Badge variant="secondary" className="text-xs">{upload.shopAccount ?? upload.sourceSystem}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-right text-foreground">{upload.rows.toLocaleString("id-ID")}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{upload.columns.toLocaleString("id-ID")}</td>
                  <td className="py-3 text-right">
                    {(upload.schemaDetected?.missing?.length ?? 0) > 0 ? (
                      <span className="text-amber-500">{upload.schemaDetected?.missing?.length}</span>
                    ) : (
                      <span className="text-emerald-500">0</span>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.uploads.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No uploaded files yet. Select a channel and upload fresh data files.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
