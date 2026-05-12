import type { DashboardData } from "@/server/analytics/dashboard-data";

type TableResult = { headers: string[]; rows: Array<Array<string | number>> };
type SkuSummary = DashboardData["skus"][number];

export type AssistantMode = "local_semantic" | "llm_api";

export interface DashboardAssistantResult {
  answer: string;
  generatedSql: string;
  table: TableResult | null;
  chartSuggestion: Record<string, unknown> | null;
  downloadUrl: string | null;
  assistantMode: AssistantMode;
  llmProvider?: string;
  llmModel?: string;
  llmError?: string;
}

interface LlmConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ChatCompletionChoice {
  message?: {
    content?: string | null;
  };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  error?: {
    message?: string;
  };
}

const metricDefinitions = [
  "Booked GMV adalah GMV order yang tercatat dari data upload sebelum cancellation exclusion.",
  "Active GMV adalah GMV aktif setelah order cancelled, returned, atau refunded dibuat menjadi 0.",
  "GT/MT berasal dari raw dashboard B2B: MT jika Area Manager atau bdcity adalah Agency, selain itu GT.",
  "GMV GT/MT berasal dari kolom SKUGMV sku gmv pada item.",
  "GMV TikTok berasal dari SKU Subtotal After Discount pada item.",
  "Scratch/Scrach Card, Poster POSM, dan MLBB Display Rack dikeluarkan dari reporting metric.",
];

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

function percent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function tableRows<T>(items: T[], mapper: (item: T) => Array<string | number>, limit = 10) {
  return items.slice(0, limit).map(mapper);
}

function getConfiguredLLM(): LlmConfig | null {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY ||
    process.env.OPENAI_API_TOKEN ||
    process.env.LLM_API_TOKEN;

  if (!apiKey) return null;

  return {
    provider: process.env.LLM_PROVIDER || "openai-compatible",
    apiKey,
    baseUrl: (process.env.LLM_API_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini",
  };
}

function channelFromQuestion(question: string) {
  if (question.includes("tiktok card") || question.includes("kayou card") || question.includes("card id")) return "tiktok2";
  if (question.includes("tiktok") || question.includes("kayou id")) return "tiktok1";
  if (question.includes("shopee")) return "shopee";
  if (question.includes("marketplace")) return "marketplace";
  if (question.includes("mt")) return "mt";
  if (question.includes("gt")) return "gt";
  return null;
}

function selectedChannels(data: DashboardData, question: string) {
  const key = channelFromQuestion(question);
  if (!key) return data.channels;
  if (key === "marketplace") return data.channels.filter((channel) => ["shopee", "tiktok1", "tiktok2"].includes(channel.channelKey));
  return data.channels.filter((channel) => channel.channelKey === key);
}

function buildChannelAnswer(question: string, data: DashboardData): DashboardAssistantResult {
  const channels = selectedChannels(data, question);
  const top = channels.slice().sort((a, b) => b.bookedGMV - a.bookedGMV)[0];

  return {
    answer: top
      ? [
          `${top.channel} memiliki Booked GMV ${formatIDR(top.bookedGMV)} dan Active GMV ${formatIDR(top.activeGMV)} pada filter saat ini.`,
          top.channelKey === "shopee" ? `Shopee Released Amount adalah ${formatIDR(top.gmvPayment)}.` : "",
          `Order: ${formatNumber(top.orders)}, active order: ${formatNumber(top.activeOrders)}, cancellation rate: ${percent(top.cancellationRate)}.`,
          "Angka dihitung dari semantic dashboard backend, bukan dari perhitungan bebas AI.",
        ].filter(Boolean).join("\n")
      : "Belum ada channel yang cocok dengan pertanyaan pada filter saat ini.",
    generatedSql: "semantic_tool:channel_summary",
    table: {
      headers: ["Channel", "Booked GMV", "Active GMV", "Released Amount", "Orders", "Cancelled", "Cancellation Rate"],
      rows: tableRows(channels, (channel) => [
        channel.channel,
        formatIDR(channel.bookedGMV),
        formatIDR(channel.activeGMV),
        channel.channelKey === "shopee" ? formatIDR(channel.gmvPayment) : "-",
        channel.orders,
        channel.cancelledOrders,
        percent(channel.cancellationRate),
      ]),
    },
    chartSuggestion: { type: "bar", dimension: "Channel", metric: "Booked GMV" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

function buildRegionalAnswer(data: DashboardData): DashboardAssistantResult {
  const rows = data.managers.regional;
  const top = rows[0];

  return {
    answer: top
      ? [
          `Regional Manager tertinggi adalah ${top.name} dengan Booked GMV ${formatIDR(top.bookedGMV)}.`,
          `Kontribusinya ${percent(top.percentageOfGT)} dari total GT pada filter saat ini, dengan ${formatNumber(top.orders)} order dan ${formatNumber(top.customers)} customer.`,
        ].join("\n")
      : "Belum ada data Regional Manager GT pada filter saat ini.",
    generatedSql: "semantic_tool:regional_manager_comparison",
    table: {
      headers: ["Regional Manager", "Booked GMV", "Active GMV", "Orders", "Customers", "% GT"],
      rows: tableRows(rows, (manager) => [
        manager.name,
        formatIDR(manager.bookedGMV),
        formatIDR(manager.activeGMV),
        manager.orders,
        manager.customers,
        percent(manager.percentageOfGT),
      ]),
    },
    chartSuggestion: { type: "donut", dimension: "Regional Manager", metric: "Booked GMV" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

function buildAreaAnswer(data: DashboardData): DashboardAssistantResult {
  const rows = data.managers.area;
  const top = rows[0];

  return {
    answer: top
      ? [
          `Area Manager tertinggi adalah ${top.name} dengan Booked GMV ${formatIDR(top.bookedGMV)} dan quantity ${formatNumber(top.quantity)}.`,
          `Regional: ${top.parentManager ?? "Unknown"}. Orders: ${formatNumber(top.orders)}, customers: ${formatNumber(top.customers)}.`,
        ].join("\n")
      : "Belum ada data Area Manager GT pada filter saat ini.",
    generatedSql: "semantic_tool:area_manager_ranking",
    table: {
      headers: ["Area Manager", "Regional Manager", "Booked GMV", "Active GMV", "Orders", "Qty"],
      rows: tableRows(rows, (manager) => [
        manager.name,
        manager.parentManager ?? "",
        formatIDR(manager.bookedGMV),
        formatIDR(manager.activeGMV),
        manager.orders,
        Math.round(manager.quantity),
      ]),
    },
    chartSuggestion: { type: "lollipop", dimension: "Area Manager", metric: "Booked GMV" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

function buildSalesAnswer(data: DashboardData): DashboardAssistantResult {
  const salesMap = new Map<string, { salesName: string; areaManager: string; orders: Set<string>; gmv: number; activeGMV: number }>();

  data.geoTransactions
    .filter((order) => order.channelKey === "gt" && order.salesName)
    .forEach((order) => {
      const name = order.salesName || "Unknown";
      const current = salesMap.get(name) ?? {
        salesName: name,
        areaManager: order.areaManager ?? "Unknown",
        orders: new Set<string>(),
        gmv: 0,
        activeGMV: 0,
      };
      current.orders.add(order.orderKey);
      current.gmv += order.bookedGMV;
      current.activeGMV += order.activeGMV;
      salesMap.set(name, current);
    });

  const rows = Array.from(salesMap.values()).sort((a, b) => b.gmv - a.gmv);
  const top = rows[0];

  return {
    answer: top
      ? `Sales/BD tertinggi adalah ${top.salesName} dengan Booked GMV ${formatIDR(top.gmv)}, Active GMV ${formatIDR(top.activeGMV)}, dan ${formatNumber(top.orders.size)} order.`
      : "Belum ada data nama sales/BD pada filter saat ini.",
    generatedSql: "semantic_tool:gt_sales_ranking",
    table: {
      headers: ["Sales / BD", "Area Manager", "Booked GMV", "Active GMV", "Orders"],
      rows: tableRows(rows, (sales) => [
        sales.salesName,
        sales.areaManager,
        formatIDR(sales.gmv),
        formatIDR(sales.activeGMV),
        sales.orders.size,
      ]),
    },
    chartSuggestion: { type: "bar", dimension: "Sales / BD", metric: "Booked GMV" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

function skuMetricValue(sku: SkuSummary, channelKey: string | null) {
  if (channelKey === "gt") return sku.gtGMV;
  if (channelKey === "mt") return sku.mtGMV;
  if (channelKey === "shopee") return sku.shopee;
  if (channelKey === "tiktok1") return sku.tiktok1;
  if (channelKey === "tiktok2") return sku.tiktok2;
  if (channelKey === "marketplace") return sku.shopee + sku.tiktok1 + sku.tiktok2;
  return sku.totalGMV;
}

function buildSkuAnswer(question: string, data: DashboardData): DashboardAssistantResult {
  const channelKey = channelFromQuestion(question);
  const rows = data.skus
    .map((sku) => ({ ...sku, selectedGMV: skuMetricValue(sku, channelKey) }))
    .filter((sku) => sku.selectedGMV > 0)
    .sort((a, b) => b.selectedGMV - a.selectedGMV);
  const top = rows[0];
  const scope = channelKey ? channelKey.toUpperCase() : "all channel";

  return {
    answer: top
      ? `SKU tertinggi untuk ${scope} adalah ${top.skuName} (${top.skuCode}) dengan GMV ${formatIDR(top.selectedGMV)} dan quantity ${formatNumber(top.quantity)}.`
      : `Belum ada SKU dengan GMV untuk scope ${scope} pada filter saat ini.`,
    generatedSql: "semantic_tool:sku_contribution",
    table: {
      headers: ["SKU", "Product", "GMV", "Qty", "Orders", "Type"],
      rows: tableRows(rows, (sku) => [
        sku.skuCode,
        sku.skuName,
        formatIDR(sku.selectedGMV),
        Math.round(sku.quantity),
        sku.orders,
        sku.skuType,
      ]),
    },
    chartSuggestion: { type: "bar", dimension: "SKU", metric: "GMV" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

function buildCancellationAnswer(question: string, data: DashboardData): DashboardAssistantResult {
  const channels = selectedChannels(data, question);
  const rows = channels.slice().sort((a, b) => b.cancellationRate - a.cancellationRate);
  const highest = rows[0];

  return {
    answer: highest
      ? [
          `${highest.channel} memiliki cancellation rate tertinggi pada scope pertanyaan: ${percent(highest.cancellationRate)}.`,
          `Cancelled order: ${formatNumber(highest.cancelledOrders)} dari ${formatNumber(highest.orders)} order. Refund/cancellation value: ${formatIDR(highest.refundAmount)}.`,
        ].join("\n")
      : "Belum ada data cancellation pada filter saat ini.",
    generatedSql: "semantic_tool:cancellation_analysis",
    table: {
      headers: ["Channel", "Orders", "Cancelled", "Cancellation Rate", "Refund / Cancellation Value"],
      rows: tableRows(rows, (channel) => [
        channel.channel,
        channel.orders,
        channel.cancelledOrders,
        percent(channel.cancellationRate),
        formatIDR(channel.refundAmount),
      ]),
    },
    chartSuggestion: { type: "donut", dimension: "Channel", metric: "Cancelled Orders" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

function buildLocationAnswer(data: DashboardData): DashboardAssistantResult {
  const cityMap = new Map<string, { province: string; city: string; orders: number; gmv: number; activeGMV: number; cancellationValue: number }>();

  data.locations.forEach((location) => {
    const key = `${location.province}|${location.city}`;
    const current = cityMap.get(key) ?? {
      province: location.province,
      city: location.city,
      orders: 0,
      gmv: 0,
      activeGMV: 0,
      cancellationValue: 0,
    };
    current.orders += location.orders;
    current.gmv += location.gmv;
    current.activeGMV += location.activeGMV;
    current.cancellationValue += location.cancellationValue;
    cityMap.set(key, current);
  });

  const rows = Array.from(cityMap.values()).sort((a, b) => b.gmv - a.gmv);
  const top = rows[0];

  return {
    answer: top
      ? `Kota tertinggi adalah ${top.city}, ${top.province} dengan Booked GMV ${formatIDR(top.gmv)}, Active GMV ${formatIDR(top.activeGMV)}, dan ${formatNumber(top.orders)} order.`
      : "Belum ada data lokasi pada filter saat ini.",
    generatedSql: "semantic_tool:city_gmv_ranking",
    table: {
      headers: ["Province", "City", "Orders", "Booked GMV", "Active GMV", "Cancellation Value"],
      rows: tableRows(rows, (location) => [
        location.province,
        location.city,
        location.orders,
        formatIDR(location.gmv),
        formatIDR(location.activeGMV),
        formatIDR(location.cancellationValue),
      ]),
    },
    chartSuggestion: { type: "map", dimension: "City", metric: "Booked GMV" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

function buildRetentionAnswer(data: DashboardData): DashboardAssistantResult {
  const retention = data.customerRetentionAnalytics;
  const topCustomer = retention.customers[0];

  return {
    answer: [
      `Pada filter saat ini terdapat ${formatNumber(retention.summary.uniqueCustomers)} unique customer.`,
      `Repeat customers: ${formatNumber(retention.summary.repeatCustomers)} (${percent(retention.summary.repeatRate)}), returning customers lintas bulan: ${formatNumber(retention.summary.returningCustomers)} (${percent(retention.summary.returningRate)}).`,
      topCustomer
        ? `Customer dengan frekuensi tertinggi adalah ${topCustomer.customer} di ${topCustomer.channel}: ${formatNumber(topCustomer.purchaseCount)} pembelian, GMV ${formatIDR(topCustomer.totalGMV)}.`
        : "Belum ada customer repeat yang terdeteksi.",
    ].join("\n"),
    generatedSql: "semantic_tool:customer_retention",
    table: {
      headers: ["Channel", "Unique Customers", "One-time", "Repeat Customers", "Repeat Rate", "Returning Rate", "Avg Frequency", "GMV"],
      rows: tableRows(retention.channels, (channel) => [
        channel.channel,
        channel.uniqueCustomers,
        channel.oneTimeCustomers,
        channel.repeatCustomers,
        percent(channel.repeatRate),
        percent(channel.returningRate),
        Math.round(channel.avgPurchaseFrequency * 10) / 10,
        formatIDR(channel.totalGMV),
      ]),
    },
    chartSuggestion: { type: "stacked-bar", dimension: "Channel", metric: "Customer purchase frequency" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

function buildExportAnswer(question: string, filters: Record<string, string> | undefined): DashboardAssistantResult {
  const params = new URLSearchParams(filters ?? {});
  const normalizedQuestion = normalizeText(question);
  if (normalizedQuestion.includes("gt")) params.set("channelGroup", "GT");
  if (normalizedQuestion.includes("mt")) params.set("channelGroup", "MT");
  if (normalizedQuestion.includes("shopee")) params.set("sourceSystem", "shopee");
  if (normalizedQuestion.includes("tiktok")) params.set("sourceSystem", "tiktok_shop");

  const downloadUrl = `/api/exports/cleaned${params.toString() ? `?${params.toString()}` : ""}`;
  return {
    answer: `Saya menyiapkan link export cleaned dataset berdasarkan filter aktif. URL: ${downloadUrl}`,
    generatedSql: "semantic_tool:cleaned_dataset_export",
    table: null,
    chartSuggestion: null,
    downloadUrl,
    assistantMode: "local_semantic",
  };
}

function buildOverviewAnswer(data: DashboardData): DashboardAssistantResult {
  const topChannel = data.channels[0];
  const topCity = data.locations[0];

  return {
    answer: [
      `Booked GMV saat ini ${formatIDR(data.summary.bookedGMV)} dan Active GMV ${formatIDR(data.summary.activeGMV)}.`,
      `Orders: ${formatNumber(data.summary.orders)}, customers: ${formatNumber(data.summary.customers)}, cancellation rate: ${percent(data.summary.cancellationRate)}.`,
      topChannel ? `Top channel: ${topChannel.channel} (${formatIDR(topChannel.bookedGMV)}).` : "Belum ada channel dengan GMV.",
      topCity ? `Top city: ${topCity.city}, ${topCity.province} (${formatIDR(topCity.gmv)}).` : "Belum ada data lokasi.",
    ].join("\n"),
    generatedSql: "semantic_tool:executive_overview",
    table: {
      headers: ["Channel", "Booked GMV", "Active GMV", "Orders", "Cancellation Rate"],
      rows: tableRows(data.channels, (channel) => [
        channel.channel,
        formatIDR(channel.bookedGMV),
        formatIDR(channel.activeGMV),
        channel.orders,
        percent(channel.cancellationRate),
      ]),
    },
    chartSuggestion: { type: "combo", dimension: "Channel", metric: "Booked GMV + Orders" },
    downloadUrl: null,
    assistantMode: "local_semantic",
  };
}

export function buildSemanticDashboardAnswer(
  question: string,
  data: DashboardData,
  filters?: Record<string, string>,
): DashboardAssistantResult {
  const q = normalizeText(question);

  if (includesAny(q, ["download", "export", "unduh", "cleaned dataset"])) return buildExportAnswer(question, filters);
  if (includesAny(q, ["retensi", "retention", "repeat", "returning", "customer beli lagi", "pembelian ulang"])) return buildRetentionAnswer(data);
  if (includesAny(q, ["regional", "rm", "regional manager"])) return buildRegionalAnswer(data);
  if (includesAny(q, ["area manager", "am ranking", "am mana", "ranking am", "top am"])) return buildAreaAnswer(data);
  if (includesAny(q, ["sales", "bd ", "bd/sales", "bd name"])) return buildSalesAnswer(data);
  if (includesAny(q, ["sku", "produk", "product"])) return buildSkuAnswer(q, data);
  if (includesAny(q, ["cancel", "cancellation", "batal", "refund", "value cancellation"])) return buildCancellationAnswer(q, data);
  if (includesAny(q, ["kota", "city", "provinsi", "province", "lokasi", "location", "geo"])) return buildLocationAnswer(data);
  if (includesAny(q, ["channel", "gmv", "gt", "mt", "marketplace", "shopee", "tiktok"])) return buildChannelAnswer(q, data);

  return buildOverviewAnswer(data);
}

function compactContext(question: string, data: DashboardData, semantic: DashboardAssistantResult, filters?: Record<string, string>) {
  return {
    question,
    filters: filters ?? {},
    dateRange: data.summary.dateRange,
    metricDefinitions,
    selectedAnalysis: {
      localAnswer: semantic.answer,
      generatedSql: semantic.generatedSql,
      chartSuggestion: semantic.chartSuggestion,
      table: semantic.table ? { headers: semantic.table.headers, rows: semantic.table.rows.slice(0, 12) } : null,
    },
    dashboardKpi: {
      bookedGMV: data.summary.bookedGMV,
      activeGMV: data.summary.activeGMV,
      refundAmount: data.summary.refundAmount,
      orders: data.summary.orders,
      activeOrders: data.summary.activeOrders,
      cancelledOrders: data.summary.cancelledOrders,
      customers: data.summary.customers,
      cancellationRate: data.summary.cancellationRate,
    },
    channels: data.channels.slice(0, 8).map((channel) => ({
      channel: channel.channel,
      bookedGMV: channel.bookedGMV,
      activeGMV: channel.activeGMV,
      gmvPayment: channel.gmvPayment,
      orders: channel.orders,
      cancelledOrders: channel.cancelledOrders,
      cancellationRate: channel.cancellationRate,
    })),
    topRegionalManagers: data.managers.regional.slice(0, 8),
    topAreaManagers: data.managers.area.slice(0, 8),
    topSkus: data.skus.slice(0, 8).map((sku) => ({
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      totalGMV: sku.totalGMV,
      gtGMV: sku.gtGMV,
      mtGMV: sku.mtGMV,
      marketplaceGMV: sku.shopee + sku.tiktok1 + sku.tiktok2,
      quantity: sku.quantity,
      orders: sku.orders,
    })),
    topLocations: data.locations.slice(0, 8),
    retention: {
      summary: data.customerRetentionAnalytics.summary,
      channels: data.customerRetentionAnalytics.channels.slice(0, 8),
      topCustomers: data.customerRetentionAnalytics.customers.slice(0, 8),
    },
    dataQuality: data.dataQuality.metrics,
  };
}

function parseLlmContent(content: string) {
  try {
    const parsed = JSON.parse(content) as Partial<{ answer: string }>;
    return parsed.answer?.trim() || content.trim();
  } catch {
    return content.trim();
  }
}

async function requestChatCompletion(config: LlmConfig, context: unknown, useJsonMode: boolean) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          {
            role: "system",
            content:
              "You are a senior Indonesian business analytics assistant for an omnichannel sales dashboard. Use only the provided JSON context. Do not invent numbers. Answer in concise Indonesian. Return JSON only: {\"answer\":\"...\"}.",
          },
          {
            role: "user",
            content: JSON.stringify(context),
          },
        ],
      }),
      signal: controller.signal,
    });

    const payload = (await response.json()) as ChatCompletionResponse;
    if (!response.ok) throw new Error(payload.error?.message || `LLM request failed with ${response.status}`);

    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned empty content");
    return parseLlmContent(content);
  } finally {
    clearTimeout(timer);
  }
}

export async function answerDashboardQuestion(
  question: string,
  data: DashboardData,
  filters?: Record<string, string>,
): Promise<DashboardAssistantResult> {
  const semantic = buildSemanticDashboardAnswer(question, data, filters);
  const config = getConfiguredLLM();

  if (!config) return semantic;

  const context = compactContext(question, data, semantic, filters);

  try {
    let answer: string;
    try {
      answer = await requestChatCompletion(config, context, true);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.toLowerCase().includes("response_format")) throw error;
      answer = await requestChatCompletion(config, context, false);
    }

    return {
      ...semantic,
      answer: answer || semantic.answer,
      assistantMode: "llm_api",
      llmProvider: config.provider,
      llmModel: config.model,
    };
  } catch (error) {
    return {
      ...semantic,
      llmError: error instanceof Error ? error.message : "LLM request failed",
    };
  }
}
