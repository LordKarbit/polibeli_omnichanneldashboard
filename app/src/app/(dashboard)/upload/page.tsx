"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Database, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { ChartCard } from "@/components/ui/chart-card";
import { Badge } from "@/components/ui/badge";
import { clearDashboardDataCache, useDashboardData } from "@/lib/dashboard-client";
import { cn } from "@/lib/utils";
import { abbreviateIDR, formatIDR } from "@/lib/format";

const sourceOptions = [
  { value: "b2b", label: "B2B GT/MT", description: "raw_dashboard CSV export", color: "#06b6d4" },
  { value: "shopee", label: "Shopee", description: "Order.all Excel export", color: "#f97316" },
  { value: "tiktok1", label: "TikTok Shop (Kayou ID)", description: "All order CSV", color: "#ef4444" },
  { value: "tiktok2", label: "TikTok Shop (Kayou Card ID)", description: "All order CSV", color: "#ec4899" },
];

const processingSteps = [
  ["Upload", "Original file stored and hashed"],
  ["Parse", "Excel/CSV rows converted to raw payloads"],
  ["Normalize", "Orders, items, locations, products, customers unified"],
  ["Deduplicate", "Order metrics deduped by source + shop + order ID"],
  ["Aggregate", "Dashboard-ready metrics refreshed"],
];

function statusIcon(status: string) {
  if (status.includes("warning")) return <AlertCircle className="h-4 w-4 text-amber-500" />;
  if (status.includes("pending") || status.includes("processing")) return <Clock className="h-4 w-4 animate-spin text-amber-500" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSource, setSelectedSource] = useState("b2b");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, isLoading } = useDashboardData(refreshKey);

  async function uploadFiles(files: FileList | File[], replace = false) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    setIsProcessing(true);
    setMessage(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.set("sourceHint", selectedSource);
      formData.set("replace", String(replace));

      const response = await fetch("/api/ingest/files", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? "Upload failed");

      setMessage(`Processed ${payload.data.totalFiles} file(s), ${payload.data.totalRawRows.toLocaleString("id-ID")} rows, ${payload.data.totalNormalizedOrders.toLocaleString("id-ID")} deduped orders.`);
      clearDashboardDataCache();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function loadSamples() {
    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/ingest/samples?replace=true", { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? "Sample ingestion failed");

      const summary = payload.data.analytics.summary;
      setMessage(`Sample QA loaded: ${summary.lineItems.toLocaleString("id-ID")} line-items, ${summary.orders.toLocaleString("id-ID")} deduped orders, ${formatIDR(summary.bookedGMV)} booked GMV.`);
      clearDashboardDataCache();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sample ingestion failed");
    } finally {
      setIsProcessing(false);
    }
  }

  const gt = data?.channels.find((channel) => channel.channelKey === "gt");
  const mt = data?.channels.find((channel) => channel.channelKey === "mt");

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
                Upload B2B GT/MT, Shopee, and TikTok Shop exports. GMV, channel, SKU, and status rules are applied automatically.
              </p>
            </div>

            <div className="mt-4 grid w-full grid-cols-2 gap-3 md:grid-cols-4">
              {sourceOptions.map((source) => (
                <button
                  key={source.value}
                  onClick={() => setSelectedSource(source.value)}
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

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isProcessing}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Select Files
              </button>
              <button
                onClick={loadSamples}
                disabled={isProcessing}
                className="rounded-lg border border-border bg-muted/30 px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
              >
                Load Provided Sample Files
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No uploaded files yet. Load the provided samples to run QA.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
