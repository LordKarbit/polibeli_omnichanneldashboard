import { aiQueryLogs } from "@/server/db/schema";
import { db } from "@/server/db";
import { badRequest, ok, readJson, serverError } from "@/server/api/http";
import { getDashboardData } from "@/server/analytics/dashboard-data";
import { sha256 } from "@/server/ingestion/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AskBody extends Record<string, unknown> {
  question?: string;
  filters?: Record<string, string>;
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function buildSearchParams(filters?: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return searchParams;
}

export async function POST(request: Request) {
  const body = await readJson<AskBody>(request);
  const question = body?.question?.trim();

  if (!question) {
    return badRequest("question is required");
  }

  const started = Date.now();

  try {
    const data = await getDashboardData(buildSearchParams(body?.filters));
    const q = question.toLowerCase();
    let answer = "";
    let generatedSql = "-- semantic dashboard query";
    let chartSuggestion: Record<string, unknown> | null = null;
    let table: { headers: string[]; rows: Array<Array<string | number>> } | null = null;
    let downloadUrl: string | null = null;

    if (q.includes("gmv") && q.includes("gt")) {
      const gt = data.channels.find((channel) => channel.channelKey === "gt");
      answer = [
        `GT booked GMV is ${formatIDR(gt?.bookedGMV ?? 0)} and active GMV is ${formatIDR(gt?.activeGMV ?? 0)}.`,
        `Filter used: channel = GT, GMV source = B2B SKUGMV sku gmv, order metrics deduped by source order ID.`,
        `Orders: ${(gt?.orders ?? 0).toLocaleString("id-ID")}; cancellation rate: ${percent(gt?.cancellationRate ?? 0)}.`,
      ].join("\n");
      generatedSql = "SELECT SUM(line_gmv) FROM order_items JOIN normalized_orders WHERE channel_group = 'GT'";
      chartSuggestion = { type: "bar", dimension: "Area Manager", metric: "Booked GMV" };
    } else if (q.includes("area manager") && (q.includes("tinggi") || q.includes("top") || q.includes("ranking"))) {
      const top = data.managers.area.slice(0, 10);
      answer = `Top Area Manager by GT GMV is ${top[0]?.name ?? "not available"} with ${formatIDR(top[0]?.bookedGMV ?? 0)} and ${(top[0]?.quantity ?? 0).toLocaleString("id-ID")} quantity.`;
      table = {
        headers: ["Area Manager", "Regional Manager", "Booked GMV", "Orders", "Qty"],
        rows: top.map((manager) => [
          manager.name,
          manager.parentManager ?? "",
          formatIDR(manager.bookedGMV),
          manager.orders,
          Math.round(manager.quantity),
        ]),
      };
      generatedSql = "SELECT area_manager, SUM(booked_order_gmv), COUNT(DISTINCT order_key) FROM semantic_orders WHERE channel_group = 'GT' GROUP BY area_manager";
      chartSuggestion = { type: "lollipop", dimension: "Area Manager", metric: "Booked GMV" };
    } else if (q.includes("nur setyo") || q.includes("hakim")) {
      const rows = data.managers.regional.filter((manager) => /nur setyo|hakim/i.test(manager.name));
      answer = rows
        .map((manager) => `${manager.name}: ${formatIDR(manager.bookedGMV)}, ${manager.orders} orders, active GMV ${formatIDR(manager.activeGMV)}.`)
        .join("\n");
      table = {
        headers: ["Regional Manager", "Booked GMV", "Active GMV", "Orders", "Customers"],
        rows: rows.map((manager) => [
          manager.name,
          formatIDR(manager.bookedGMV),
          formatIDR(manager.activeGMV),
          manager.orders,
          manager.customers,
        ]),
      };
      chartSuggestion = { type: "grouped-bar", dimension: "Regional Manager", metric: "Booked vs Active GMV" };
    } else if (q.includes("sku") && q.includes("mt")) {
      const top = data.skus.filter((sku) => sku.mtGMV > 0).slice(0, 10);
      answer = `Top MT SKU is ${top[0]?.skuName ?? "not available"} with ${formatIDR(top[0]?.mtGMV ?? 0)} MT GMV. MT is classified by Agency in Area Manager/bdcity.`;
      table = {
        headers: ["SKU", "Product", "MT GMV", "Qty", "Orders"],
        rows: top.map((sku) => [sku.skuCode, sku.skuName, formatIDR(sku.mtGMV), Math.round(sku.quantity), sku.orders]),
      };
      generatedSql = "SELECT sku, SUM(line_gmv) FROM semantic_items WHERE channel_group = 'MT' GROUP BY sku ORDER BY 2 DESC";
    } else if (q.includes("cancellation") || q.includes("cancel")) {
      const target = q.includes("card") || q.includes("shop 2") ? "tiktok2" : q.includes("tiktok") ? "tiktok1" : undefined;
      const channels = target ? data.channels.filter((channel) => channel.channelKey === target) : data.channels;
      const highest = channels.slice().sort((a, b) => b.cancellationRate - a.cancellationRate)[0];
      answer = `${highest?.channel ?? "Selected channel"} cancellation rate is ${percent(highest?.cancellationRate ?? 0)} (${highest?.cancelledOrders ?? 0}/${highest?.orders ?? 0} orders), with refund amount ${formatIDR(highest?.refundAmount ?? 0)}.`;
      table = {
        headers: ["Channel", "Orders", "Cancelled", "Cancellation Rate", "Refund"],
        rows: channels.map((channel) => [
          channel.channel,
          channel.orders,
          channel.cancelledOrders,
          percent(channel.cancellationRate),
          formatIDR(channel.refundAmount),
        ]),
      };
      chartSuggestion = { type: "donut", dimension: "Channel", metric: "Cancelled Orders" };
    } else if (q.includes("kota") || q.includes("city") || q.includes("lokasi")) {
      const top = data.locations.slice(0, 10);
      answer = `Top city by GMV is ${top[0]?.city ?? "not available"} (${top[0]?.source ?? ""}) with ${formatIDR(top[0]?.gmv ?? 0)}.`;
      table = {
        headers: ["Source", "Province", "City", "Orders", "GMV"],
        rows: top.map((location) => [
          location.source,
          location.province,
          location.city,
          location.orders,
          formatIDR(location.gmv),
        ]),
      };
      chartSuggestion = { type: "map", dimension: "City", metric: "GMV" };
    } else if (q.includes("download") || q.includes("export")) {
      const manager = data.managers.area.find((item) => q.includes(item.name.toLowerCase()));
      const params = new URLSearchParams();
      if (manager) params.set("areaManager", manager.name);
      if (q.includes("gt")) params.set("channelGroup", "GT");
      downloadUrl = `/api/exports/cleaned?${params.toString()}`;
      answer = `Prepared a cleaned dataset export using current dashboard metric definitions. Download URL: ${downloadUrl || "/api/exports/cleaned"}`;
      generatedSql = "SELECT * FROM cleaned_unified_transactions WHERE filters = current_dashboard_filters";
    } else {
      answer = [
        `Current filtered booked GMV is ${formatIDR(data.summary.bookedGMV)} and active GMV is ${formatIDR(data.summary.activeGMV)}.`,
        `Orders: ${data.summary.orders.toLocaleString("id-ID")}; line items: ${data.summary.lineItems.toLocaleString("id-ID")}; cancellation rate: ${percent(data.summary.cancellationRate)}.`,
        "Ask about GT GMV, MT SKU, marketplace cancellation, top cities, manager ranking, or exports for a focused answer.",
      ].join("\n");
      chartSuggestion = { type: "combo", dimension: "Channel", metric: "Booked GMV + Orders" };
    }

    await db.insert(aiQueryLogs).values({
      question,
      generatedSql,
      safeSqlHash: sha256(generatedSql),
      filterContext: body?.filters ?? null,
      answerSummary: answer,
      chartSuggestion,
      resultRowCount: table?.rows.length ?? 0,
      latencyMs: Date.now() - started,
      status: "answered",
    });

    return ok({
      answer,
      generatedSql,
      table,
      chartSuggestion,
      downloadUrl,
      filterContext: body?.filters ?? {},
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    await db.insert(aiQueryLogs).values({
      question,
      generatedSql: null,
      safeSqlHash: null,
      filterContext: body?.filters ?? null,
      answerSummary: null,
      resultRowCount: 0,
      latencyMs: Date.now() - started,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown AI query error",
    });
    return serverError(error);
  }
}
