import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import { and, eq, inArray, or, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

import { db } from "@/server/db";
import {
  aiQueryLogs,
  areaManagers,
  channels,
  cleanedDatasetExports,
  customers,
  dedupeKeys,
  locations,
  marketplaceOrders,
  metricsSnapshots,
  normalizedOrders,
  orderItems,
  orderStatuses,
  platforms,
  productAliases,
  products,
  rawOrderLines,
  rawUploadedFiles,
  regionalManagers,
  salesHierarchy,
  sourceFieldMappings,
  uploadBatches,
} from "@/server/db/schema";
import { itemDedupeHash, orderDedupeHash, rowHash, sha256 } from "@/server/ingestion/hash";
import { inferSkuType, normalizeStatus } from "@/server/ingestion/normalize";

export type SourceHint = "b2b" | "shopee" | "shopee_income" | "tiktok1" | "tiktok2" | "tiktok1_income" | "tiktok2_income";

export interface DashboardFileInput {
  fileName: string;
  buffer: Buffer;
  sourceHint?: SourceHint;
}

export interface ProcessDashboardFilesOptions {
  batchId?: string;
  notes?: string;
  replace?: boolean;
  persistFiles?: boolean;
}

interface SourceConfig {
  sourceSystem: "b2b_raw_dashboard" | "shopee" | "shopee_income" | "tiktok_shop" | "tiktok_income";
  shopAccount: string;
  sourceHint: SourceHint;
  channelHint: string;
  fileKind: "orders" | "income";
}

interface TikTokIncomeSummary {
  periodStart: Date | null;
  periodEnd: Date | null;
  totalSettlementAmount: number;
  totalRevenue: number;
  totalFees: number;
  hasSettlementMetric: boolean;
  sourceSheet: string;
}

interface ParsedFile {
  config: SourceConfig;
  fileName: string;
  fileHash: string;
  fileType: string;
  size: number;
  rows: Record<string, unknown>[];
  columns: string[];
  sheetName: string;
  incomeSummary?: TikTokIncomeSummary;
}

interface NormalizedItemDraft {
  rawLineId?: string;
  sourceLineNumber: number;
  sourceSkuCode: string;
  sourceProductName: string;
  sourceVariationName?: string;
  quantity: number;
  returnedQuantity: number;
  unitOriginalPrice: number;
  unitDiscountedPrice: number;
  lineGrossAmount: number;
  lineGmv: number;
  lineDiscountAmount: number;
  lineSellerDiscountAmount: number;
  linePlatformDiscountAmount: number;
  lineGrossProfitAmount: number;
  skuType: string;
  isFreeItem: boolean;
  isBundleComponent: boolean;
  isPosm: boolean;
  rawItemSnapshot: Record<string, unknown>;
}

interface NormalizedOrderDraft {
  sourceSystem: string;
  shopAccount: string;
  sourceOrderId: string;
  orderKey: string;
  channelGroup: string;
  channelName: string;
  orderStatusRaw: string;
  orderSubstatusRaw: string;
  normalizedStatus: string;
  orderCreatedAt: Date | null;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  bookedOrderGmv: number;
  activeOrderGmv: number;
  orderPaidAmount: number;
  orderPayableAmount: number;
  orderDiscountAmount: number;
  orderRefundAmount: number;
  shippingFeeAmount: number;
  paymentMethod: string | null;
  provinceRaw: string;
  cityRaw: string;
  districtRaw: string;
  villageRaw: string;
  customer: {
    sourceCustomerId: string;
    customerName: string;
    buyerUsername: string;
    recipientName: string;
    piiMask: string;
  };
  sales: {
    regionalManager: string;
    areaManager: string;
    bdName: string;
    bdWorkcode: string;
    bdCity: string;
    bdProvince: string;
    isAgency: boolean;
  } | null;
  marketplace: {
    marketplaceStatusRaw: string;
    paymentStatusRaw: string;
    fulfillmentStatusRaw: string;
    cancellationReason: string;
    refundStatus: string;
    refundAmount: number;
    skuGrossSalesAmount: number;
    sellerDiscountAmount: number;
    platformDiscountAmount: number;
    voucherAmount: number;
    logisticsProvider: string;
    trackingNumber: string;
  } | null;
  rawOrderSnapshot: Record<string, unknown>;
  items: NormalizedItemDraft[];
}

const SOURCE_CONFIGS: Record<SourceHint, SourceConfig> = {
  b2b: {
    sourceSystem: "b2b_raw_dashboard",
    shopAccount: "B2B GT/MT",
    sourceHint: "b2b",
    channelHint: "B2B",
    fileKind: "orders",
  },
  shopee: {
    sourceSystem: "shopee",
    shopAccount: "Shopee",
    sourceHint: "shopee",
    channelHint: "Marketplace",
    fileKind: "orders",
  },
  shopee_income: {
    sourceSystem: "shopee_income",
    shopAccount: "Shopee",
    sourceHint: "shopee_income",
    channelHint: "Marketplace",
    fileKind: "income",
  },
  tiktok1: {
    sourceSystem: "tiktok_shop",
    shopAccount: "TikTok Shop (Kayou ID)",
    sourceHint: "tiktok1",
    channelHint: "Marketplace",
    fileKind: "orders",
  },
  tiktok2: {
    sourceSystem: "tiktok_shop",
    shopAccount: "TikTok Shop (Kayou Card ID)",
    sourceHint: "tiktok2",
    channelHint: "Marketplace",
    fileKind: "orders",
  },
  tiktok1_income: {
    sourceSystem: "tiktok_income",
    shopAccount: "TikTok Shop (Kayou ID)",
    sourceHint: "tiktok1_income",
    channelHint: "Marketplace",
    fileKind: "income",
  },
  tiktok2_income: {
    sourceSystem: "tiktok_income",
    shopAccount: "TikTok Shop (Kayou Card ID)",
    sourceHint: "tiktok2_income",
    channelHint: "Marketplace",
    fileKind: "income",
  },
};

const REQUIRED_FIELDS: Record<SourceHint, string[]> = {
  b2b: ["sale order no", "Area Manager", "bdcity", "SKUGMV sku gmv", "SKU skucode"],
  shopee: ["No. Pesanan", "Status Pesanan", "Total Pembayaran", "Harga Setelah Diskon", "Jumlah"],
  shopee_income: ["Summary: Total Released Amount"],
  tiktok1: ["Order ID", "Order Status", "Order Amount", "SKU Subtotal After Discount", "Seller SKU"],
  tiktok2: ["Order ID", "Order Status", "Order Amount", "SKU Subtotal After Discount", "Seller SKU"],
  tiktok1_income: ["Reports: Total settlement amount"],
  tiktok2_income: ["Reports: Total settlement amount"],
};

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\t/g, "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: unknown) {
  const text = cleanText(value);
  if (!text) return 0;

  const normalized = text
    .replace(/Rp|IDR/gi, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, "");

  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (["DKI", "DI", "DIY"].includes(upper)) return upper === "DIY" ? "DI" : upper;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function normalizeProvince(value: unknown) {
  const text = cleanText(value);
  if (!text) return "Unknown";
  if (text.toLowerCase() === "other") return "Other";
  return titleCase(text);
}

function normalizeCityStandard(value: unknown) {
  const text = cleanText(value);
  if (!text) return "Unknown";
  if (text.toLowerCase() === "agency") return "Agency";

  const normalized = text
    .replace(/\+/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutDot = normalized.replace(/\./g, " ");
  const kabPrefix = withoutDot.match(/^kab(?:upaten)?\s+(.+)$/i);
  const kotaAdminPrefix = withoutDot.match(/^kota\s+administrasi\s+(.+)$/i);
  const kotaPrefix = withoutDot.match(/^kota\s+(.+)$/i);
  const regencySuffix = withoutDot.match(/^(.+?)\s+regency$/i);
  const citySuffix = withoutDot.match(/^(.+?)\s+city$/i);

  if (kabPrefix) return `Kabupaten ${titleCase(kabPrefix[1])}`;
  if (kotaAdminPrefix) return `Kota ${titleCase(kotaAdminPrefix[1])}`;
  if (kotaPrefix) return `Kota ${titleCase(kotaPrefix[1])}`;
  if (regencySuffix) return `Kabupaten ${titleCase(regencySuffix[1])}`;
  if (citySuffix) return `Kota ${titleCase(citySuffix[1])}`;

  return titleCase(normalized);
}

function normalizeSourceOrderId(value: unknown) {
  return cleanText(value).replace(/\.0$/, "");
}

function parseDate(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;

  const compact = text.match(/^(\d{4})(\d{2})(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (compact) {
    return new Date(
      Number(compact[1]),
      Number(compact[2]) - 1,
      Number(compact[3]),
      Number(compact[4] ?? 0),
      Number(compact[5] ?? 0),
      Number(compact[6] ?? 0),
    );
  }

  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmy) {
    const year = Number(dmy[3]) < 100 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    return new Date(
      year,
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      Number(dmy[4] ?? 0),
      Number(dmy[5] ?? 0),
      Number(dmy[6] ?? 0),
    );
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIncomeDate(value: unknown, boundary: "start" | "end" = "start") {
  const text = cleanText(value);
  const slash = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (slash) {
    const [, year, month, day] = slash;
    const time = boundary === "start" ? "T00:00:00+07:00" : "T23:59:59+07:00";
    const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}${time}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return parseDate(text);
}

function dateOnly(value: Date | null) {
  return value ? new Date(value.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;
}

function normalizeIncomeLabel(value: unknown) {
  return cleanText(value).replace(/:$/, "").replace(/^\d+\.\s*/, "").toLowerCase();
}

function isIncomeLabelMatch(value: unknown, label: string) {
  const source = normalizeIncomeLabel(value);
  const target = normalizeIncomeLabel(label);
  if (target.length <= 3) return source === target;
  return source === target || source.includes(target);
}

function findIncomeRowValue(rows: unknown[][], label: string) {
  for (const row of rows) {
    const cells = row.map(cleanText);
    const labelIndex = cells.findIndex((cell) => isIncomeLabelMatch(cell, label));
    if (labelIndex < 0) continue;

    return [...cells]
      .slice(labelIndex + 1)
      .reverse()
      .find((cell) => cell.length > 0) ?? "";
  }

  return "";
}

function parseIncomePeriod(value: unknown) {
  const text = cleanText(value);
  const [rawStart, rawEnd] = text.split(/\s*-\s*/);

  return {
    periodStart: parseIncomeDate(rawStart, "start"),
    periodEnd: parseIncomeDate(rawEnd ?? rawStart, "end"),
  };
}

function isCancelled(normalizedStatus: string) {
  return normalizedStatus === "cancelled" || normalizedStatus === "returned" || normalizedStatus === "refunded";
}

function sourceLabel(sourceSystem: string, shopAccount: string, channelGroup: string) {
  if (channelGroup === "GT") return "B2B GT";
  if (channelGroup === "MT") return "B2B MT";
  if (sourceSystem === "shopee") return "Shopee";
  return shopAccount;
}

function inferSource(fileName: string, sourceHint?: SourceHint): SourceConfig {
  if (sourceHint) return SOURCE_CONFIGS[sourceHint];

  const lower = fileName.toLowerCase();
  if (lower.includes("raw_dashboard")) return SOURCE_CONFIGS.b2b;
  if (lower.includes("order.all") || lower.includes("shopee")) return SOURCE_CONFIGS.shopee;
  if (lower.includes("income.released") || lower.includes("released.id")) return SOURCE_CONFIGS.shopee_income;
  if (lower.includes("income") || lower.includes("settlement")) return SOURCE_CONFIGS.tiktok1_income;
  if (lower.includes("14_02") || lower.includes("card")) return SOURCE_CONFIGS.tiktok2;
  if (lower.includes("14_03") || lower.includes("all order")) return SOURCE_CONFIGS.tiktok1;

  return SOURCE_CONFIGS.b2b;
}

function cleanRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      cleanText(key),
      typeof value === "string" ? cleanText(value) : value,
    ]),
  );
}

function normalizeHeader(value: unknown, index: number, sheetName: string) {
  const text = cleanText(value);
  if (text) return text;
  if (sheetName === "Seller Fee" && index === 1) return "Line Type";
  return `Column ${index + 1}`;
}

function isIncomeTableHeader(sheetName: string, cells: string[]) {
  const normalizedSheet = sheetName.toLowerCase();
  const normalizedCells = cells.map((cell) => cell.toLowerCase());
  const has = (label: string) => normalizedCells.includes(label.toLowerCase());

  if (normalizedSheet === "order details") return has("order/adjustment id") || normalizedCells.some((cell) => cell.includes("order/adjustment id"));
  if (normalizedSheet === "withdrawal records") return has("reference id") && has("amount");
  if (normalizedSheet === "income") return has("order id") && normalizedCells.some((cell) => cell.includes("total released amount"));
  if (normalizedSheet === "seller fee") return has("order id") && has("product name");
  if (normalizedSheet === "adjustment") return has("adjustment complete date") && has("adjustment amount");
  if (normalizedSheet === "shipping fee discrepancy") return has("order id") && normalizedCells.some((cell) => cell.includes("expected shipping fee"));

  return false;
}

function mapIncomeFields(headers: string[], cells: string[]) {
  return Object.fromEntries(
    headers.map((header, index) => [header, cells[index] ?? ""]),
  );
}

function buildIncomeRows(sheetRows: Array<{ sheetName: string; rows: unknown[][] }>) {
  return sheetRows.flatMap(({ sheetName, rows }) => {
    let currentHeaders: string[] | null = null;
    return rows
      .map((cells, index) => {
        const normalizedCells = cells.map(cleanText);
        const nonEmpty = normalizedCells.filter(Boolean);
        const isHeader = isIncomeTableHeader(sheetName, normalizedCells);
        if (isHeader) {
          currentHeaders = normalizedCells.map((cell, cellIndex) => normalizeHeader(cell, cellIndex, sheetName));
        }

        const fields = currentHeaders && !isHeader ? mapIncomeFields(currentHeaders, normalizedCells) : null;
        return {
          sheetName,
          rowNumber: index + 1,
          rowType: isHeader ? "header" : fields ? "table" : "summary",
          label: nonEmpty.slice(0, -1).join(" / "),
          value: nonEmpty[nonEmpty.length - 1] ?? "",
          cells: normalizedCells,
          fields,
        };
      })
      .filter((row) => row.cells.some(Boolean));
  });
}

function buildIncomeParsedFile(
  input: DashboardFileInput,
  config: SourceConfig,
  sheetName: string,
  sheetRows: Array<{ sheetName: string; rows: unknown[][] }>,
  incomeSummary: TikTokIncomeSummary,
): ParsedFile {
  const rows = buildIncomeRows(sheetRows);

  return {
    config,
    fileName: input.fileName,
    fileHash: sha256(input.buffer),
    fileType: extname(input.fileName).replace(".", "").toLowerCase() || "xlsx",
    size: input.buffer.byteLength,
    rows,
    columns: ["sheetName", "rowNumber", "rowType", "label", "value", "cells", "fields"],
    sheetName,
    incomeSummary,
  };
}

function parseTikTokIncomeWorkbook(input: DashboardFileInput, config: SourceConfig): ParsedFile {
  const workbook = XLSX.read(input.buffer, {
    type: "buffer",
    raw: false,
    cellDates: false,
    codepage: 65001,
  });
  const sheetName =
    workbook.SheetNames.find((name) => name.toLowerCase() === "reports") ??
    workbook.SheetNames.find((name) => name.toLowerCase().includes("report")) ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const reportRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const allSheetRows = workbook.SheetNames.map((name) => ({
    sheetName: name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    }),
  }));
  const period = parseIncomePeriod(findIncomeRowValue(reportRows, "Time period"));
  const rawSettlementAmount = findIncomeRowValue(reportRows, "Total settlement amount");
  const totalSettlementAmount = parseNumber(rawSettlementAmount);
  const totalRevenue = parseNumber(findIncomeRowValue(reportRows, "Total Revenue"));
  const totalFees = parseNumber(findIncomeRowValue(reportRows, "Total Fees"));

  return buildIncomeParsedFile(input, config, sheetName, allSheetRows, {
    ...period,
    totalSettlementAmount,
    totalRevenue,
    totalFees,
    hasSettlementMetric: cleanText(rawSettlementAmount).length > 0,
    sourceSheet: sheetName,
  });
}

function parseShopeeIncomeWorkbook(input: DashboardFileInput, config: SourceConfig): ParsedFile {
  const workbook = XLSX.read(input.buffer, {
    type: "buffer",
    raw: false,
    cellDates: false,
    codepage: 65001,
  });
  const sheetName =
    workbook.SheetNames.find((name) => name.toLowerCase() === "summary") ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const summaryRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const allSheetRows = workbook.SheetNames.map((name) => ({
    sheetName: name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    }),
  }));
  const rawReleasedAmount = findIncomeRowValue(summaryRows, "Total Released Amount");
  const periodStart = parseIncomeDate(findIncomeRowValue(summaryRows, "From"), "start");
  const periodEnd = parseIncomeDate(findIncomeRowValue(summaryRows, "to"), "end");

  return buildIncomeParsedFile(input, config, sheetName, allSheetRows, {
    periodStart,
    periodEnd,
    totalSettlementAmount: parseNumber(rawReleasedAmount),
    totalRevenue: parseNumber(findIncomeRowValue(summaryRows, "Total Revenue")),
    totalFees: parseNumber(findIncomeRowValue(summaryRows, "Total Expenses")),
    hasSettlementMetric: cleanText(rawReleasedAmount).length > 0,
    sourceSheet: sheetName,
  });
}

function parseWorkbook(input: DashboardFileInput): ParsedFile {
  const config = inferSource(input.fileName, input.sourceHint);
  if (config.fileKind === "income") {
    if (config.sourceHint === "shopee_income") return parseShopeeIncomeWorkbook(input, config);
    return parseTikTokIncomeWorkbook(input, config);
  }

  const isCsv = extname(input.fileName).toLowerCase() === ".csv";
  const workbook = isCsv
    ? XLSX.read(input.buffer.toString("utf8").replace(/^\uFEFF/, ""), {
        type: "string",
        raw: false,
        cellDates: false,
        codepage: 65001,
      })
    : XLSX.read(input.buffer, {
        type: "buffer",
        raw: false,
        cellDates: false,
        codepage: 65001,
      });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils
    .sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
      blankrows: false,
    })
    .map(cleanRow);
  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return {
    config,
    fileName: input.fileName,
    fileHash: sha256(input.buffer),
    fileType: extname(input.fileName).replace(".", "").toLowerCase() || "csv",
    size: input.buffer.byteLength,
    rows,
    columns,
    sheetName,
  };
}

function getSchemaDetected(file: ParsedFile) {
  if (file.config.fileKind === "income") {
    const required = REQUIRED_FIELDS[file.config.sourceHint];
    const hasSettlement = Boolean(file.incomeSummary?.hasSettlementMetric);
    const missing = hasSettlement ? [] : required;

    return {
      sheetName: file.sheetName,
      columns: file.columns,
      required,
      missing,
      rowCount: file.rows.length,
      fileKind: "income",
      releasedAmount: file.incomeSummary?.totalSettlementAmount ?? 0,
      totalRevenue: file.incomeSummary?.totalRevenue ?? 0,
      totalFees: file.incomeSummary?.totalFees ?? 0,
      periodStart: dateOnly(file.incomeSummary?.periodStart ?? null),
      periodEnd: dateOnly(file.incomeSummary?.periodEnd ?? null),
      isValid: missing.length === 0,
    };
  }

  const required = REQUIRED_FIELDS[file.config.sourceHint];
  const columnSet = new Set(file.columns);
  const missing = required.filter((field) => !columnSet.has(field));

  return {
    sheetName: file.sheetName,
    columns: file.columns,
    required,
    missing,
    rowCount: file.rows.length,
    isValid: missing.length === 0,
  };
}

function getRowSourceOrderId(row: Record<string, unknown>, config: SourceConfig) {
  if (config.sourceSystem === "b2b_raw_dashboard") return normalizeSourceOrderId(row["sale order no"] || row["sale order id"]);
  if (config.sourceSystem === "shopee") return normalizeSourceOrderId(row["No. Pesanan"]);
  return normalizeSourceOrderId(row["Order ID"]);
}

function getRowSourceSku(row: Record<string, unknown>, config: SourceConfig) {
  if (config.sourceSystem === "b2b_raw_dashboard") return cleanText(row["SKU skucode"] || row["barcode"] || row["itemid"]);
  if (config.sourceSystem === "shopee") return cleanText(row["Nomor Referensi SKU"] || row["SKU Induk"]);
  return cleanText(row["Seller SKU"] || row["SKU ID"]);
}

function b2bChannel(row: Record<string, unknown>) {
  const areaManager = cleanText(row["Area Manager"]);
  const bdCity = cleanText(row.bdcity);
  return areaManager.toLowerCase() === "agency" || bdCity.toLowerCase() === "agency" ? "MT" : "GT";
}

function createOrderDraft(row: Record<string, unknown>, config: SourceConfig): NormalizedOrderDraft {
  const sourceOrderId = getRowSourceOrderId(row, config);
  const orderKey = `${config.sourceSystem}|${config.shopAccount}|${sourceOrderId}`;

  if (config.sourceSystem === "b2b_raw_dashboard") {
    const channelGroup = b2bChannel(row);
    const statusRaw = cleanText(row["order status"]);
    const normalizedStatus = normalizeStatus(statusRaw);
    const isAgency = channelGroup === "MT";

    return {
      sourceSystem: config.sourceSystem,
      shopAccount: config.shopAccount,
      sourceOrderId,
      orderKey,
      channelGroup,
      channelName: channelGroup === "MT" ? "Modern Trade" : "General Trade",
      orderStatusRaw: statusRaw,
      orderSubstatusRaw: cleanText(row["fulfill status"] || row["pay status"]),
      normalizedStatus,
      orderCreatedAt: parseDate(row["order create time"]),
      paidAt: parseDate(row["pay time"]),
      shippedAt: parseDate(row["SKU sku delivery time"]),
      deliveredAt: parseDate(row["confirm receipt time"]),
      cancelledAt: null,
      bookedOrderGmv: 0,
      activeOrderGmv: 0,
      orderPaidAmount: parseNumber(row["IDR total paid amount"]),
      orderPayableAmount: parseNumber(row["IDR total payable amount"]),
      orderDiscountAmount: parseNumber(row["IDR total discount amount"]),
      orderRefundAmount: parseNumber(row["IDR total refund amount"]),
      shippingFeeAmount: 0,
      paymentMethod: cleanText(row["pay type"]) || null,
      provinceRaw: cleanText(row["recipient addressprovince"] || row.bdprovince),
      cityRaw: cleanText(row["recipient addresscity"] || row.bdcity),
      districtRaw: cleanText(row["recipient addressarea"]),
      villageRaw: "",
      customer: {
        sourceCustomerId: cleanText(row["id buyerid"]),
        customerName: cleanText(row["customer name_1"] || row["customer name"]),
        buyerUsername: "",
        recipientName: cleanText(row.recipient),
        piiMask: "",
      },
      sales: {
        regionalManager: cleanText(row["Regional Manager"]) || (isAgency ? "Agency" : "Unassigned"),
        areaManager: cleanText(row["Area Manager"]) || (isAgency ? "Agency" : "Unassigned"),
        bdName: cleanText(row["BD bd name"]),
        bdWorkcode: cleanText(row["BD bd workcode"]),
        bdCity: cleanText(row.bdcity),
        bdProvince: cleanText(row.bdprovince),
        isAgency,
      },
      marketplace: null,
      rawOrderSnapshot: row,
      items: [],
    };
  }

  if (config.sourceSystem === "shopee") {
    const statusRaw = cleanText(row["Status Pesanan"]);
    const normalizedStatus = normalizeStatus(statusRaw);

    return {
      sourceSystem: config.sourceSystem,
      shopAccount: config.shopAccount,
      sourceOrderId,
      orderKey,
      channelGroup: "Marketplace",
      channelName: "Shopee",
      orderStatusRaw: statusRaw,
      orderSubstatusRaw: cleanText(row["Status Pembatalan/ Pengembalian"]),
      normalizedStatus,
      orderCreatedAt: parseDate(row["Waktu Pesanan Dibuat"]),
      paidAt: parseDate(row["Waktu Pembayaran Dilakukan"]),
      shippedAt: parseDate(row["Waktu Pengiriman Diatur"]),
      deliveredAt: parseDate(row["Waktu Pesanan Selesai"]),
      cancelledAt: isCancelled(normalizedStatus) ? parseDate(row["Waktu Pesanan Selesai"]) : null,
      bookedOrderGmv: parseNumber(row["Total Pembayaran"]),
      activeOrderGmv: 0,
      orderPaidAmount: parseNumber(row["Dibayar Pembeli"] || row["Total Pembayaran"]),
      orderPayableAmount: parseNumber(row["Total Pembayaran"]),
      orderDiscountAmount: parseNumber(row["Total Diskon"]),
      orderRefundAmount: 0,
      shippingFeeAmount: parseNumber(row["Ongkos Kirim Dibayar oleh Pembeli"]),
      paymentMethod: cleanText(row["Metode Pembayaran"]) || null,
      provinceRaw: cleanText(row.Provinsi),
      cityRaw: cleanText(row["Kota/Kabupaten"]),
      districtRaw: "",
      villageRaw: "",
      customer: {
        sourceCustomerId: cleanText(row["Username (Pembeli)"]),
        customerName: cleanText(row["Nama Penerima"]),
        buyerUsername: cleanText(row["Username (Pembeli)"]),
        recipientName: cleanText(row["Nama Penerima"]),
        piiMask: cleanText(row["No. Telepon"]),
      },
      sales: null,
      marketplace: {
        marketplaceStatusRaw: statusRaw,
        paymentStatusRaw: cleanText(row["Status Pembatalan/ Pengembalian"]),
        fulfillmentStatusRaw: cleanText(row["Opsi Pengiriman"]),
        cancellationReason: cleanText(row["Alasan Pembatalan"]),
        refundStatus: cleanText(row["Status Pembatalan/ Pengembalian"]),
        refundAmount: 0,
        skuGrossSalesAmount: 0,
        sellerDiscountAmount: 0,
        platformDiscountAmount: 0,
        voucherAmount: 0,
        logisticsProvider: cleanText(row["Opsi Pengiriman"]),
        trackingNumber: cleanText(row["No. Resi"]),
      },
      rawOrderSnapshot: row,
      items: [],
    };
  }

  const statusRaw = cleanText(row["Order Status"]);
  const normalizedStatus = normalizeStatus(statusRaw);
  const refundAmount = parseNumber(row["Order Refund Amount"]);

  return {
    sourceSystem: config.sourceSystem,
    shopAccount: config.shopAccount,
    sourceOrderId,
    orderKey,
    channelGroup: "Marketplace",
    channelName: config.shopAccount,
    orderStatusRaw: statusRaw,
    orderSubstatusRaw: cleanText(row["Order Substatus"]),
    normalizedStatus,
    orderCreatedAt: parseDate(row["Created Time"]),
    paidAt: parseDate(row["Paid Time"]),
    shippedAt: parseDate(row["Shipped Time"]),
    deliveredAt: parseDate(row["Delivered Time"]),
    cancelledAt: parseDate(row["Cancelled Time"]),
    bookedOrderGmv: parseNumber(row["Order Amount"]),
    activeOrderGmv: 0,
    orderPaidAmount: parseNumber(row["Order Amount"]),
    orderPayableAmount: parseNumber(row["Order Amount"]),
    orderDiscountAmount: parseNumber(row["SKU Platform Discount"]) + parseNumber(row["SKU Seller Discount"]),
    orderRefundAmount: refundAmount,
    shippingFeeAmount: parseNumber(row["Shipping Fee After Discount"]),
    paymentMethod: cleanText(row["Payment Method"]) || null,
    provinceRaw: cleanText(row.Province),
    cityRaw: cleanText(row["Regency and City"]),
    districtRaw: cleanText(row.Districts),
    villageRaw: cleanText(row.Villages),
    customer: {
      sourceCustomerId: cleanText(row["Buyer Username"]),
      customerName: cleanText(row.Recipient),
      buyerUsername: cleanText(row["Buyer Username"]),
      recipientName: cleanText(row.Recipient),
      piiMask: cleanText(row["Phone #"]),
    },
    sales: null,
    marketplace: {
      marketplaceStatusRaw: statusRaw,
      paymentStatusRaw: cleanText(row["Payment Method"]),
      fulfillmentStatusRaw: cleanText(row["Fulfillment Type"]),
      cancellationReason: cleanText(row["Cancel Reason"]),
      refundStatus: cleanText(row["Cancelation/Return Type"]),
      refundAmount,
      skuGrossSalesAmount: 0,
      sellerDiscountAmount: 0,
      platformDiscountAmount: 0,
      voucherAmount: 0,
      logisticsProvider: cleanText(row["Shipping Provider Name"]),
      trackingNumber: cleanText(row["Tracking ID"]),
    },
    rawOrderSnapshot: row,
    items: [],
  };
}

function createItemDraft(
  row: Record<string, unknown>,
  config: SourceConfig,
  sourceLineNumber: number,
  rawLineId?: string,
): NormalizedItemDraft {
  if (config.sourceSystem === "b2b_raw_dashboard") {
    const lineGmv = parseNumber(row["SKUGMV sku gmv"]);
    const sourceSkuCode = getRowSourceSku(row, config);
    const productName = cleanText(row["spu name"] || row["SKU sku name"]);
    const skuType = inferSkuType(sourceSkuCode, productName, lineGmv);

    return {
      rawLineId,
      sourceLineNumber,
      sourceSkuCode,
      sourceProductName: productName,
      sourceVariationName: cleanText(row["SKU sku name"]),
      quantity: parseNumber(row["SKU sku quantity"]),
      returnedQuantity: 0,
      unitOriginalPrice: parseNumber(row["SKUIDR sku price"]),
      unitDiscountedPrice: parseNumber(row["SKUIDR sku platform price"]),
      lineGrossAmount: parseNumber(row["SKUIDR sku total amount"]),
      lineGmv,
      lineDiscountAmount: parseNumber(row["SKUIDR sku total discount amount"]),
      lineSellerDiscountAmount: parseNumber(row["SKUIDR sku discount amount"]),
      linePlatformDiscountAmount: 0,
      lineGrossProfitAmount: parseNumber(row["SKUIDR sku gross profit amount"]),
      skuType,
      isFreeItem: lineGmv === 0 || skuType === "free_gift",
      isBundleComponent: skuType === "bundle",
      isPosm: skuType === "posm",
      rawItemSnapshot: row,
    };
  }

  if (config.sourceSystem === "shopee") {
    const quantity = parseNumber(row.Jumlah);
    const discounted = parseNumber(row["Harga Setelah Diskon"]);
    const lineGmv = discounted * quantity;
    const sourceSkuCode = getRowSourceSku(row, config);
    const productName = cleanText(row["Nama Produk"]);
    const skuType = inferSkuType(sourceSkuCode, productName, lineGmv);

    return {
      rawLineId,
      sourceLineNumber,
      sourceSkuCode,
      sourceProductName: productName,
      sourceVariationName: cleanText(row["Nama Variasi"]),
      quantity,
      returnedQuantity: parseNumber(row["Returned quantity"]),
      unitOriginalPrice: parseNumber(row["Harga Awal"]),
      unitDiscountedPrice: discounted,
      lineGrossAmount: parseNumber(row["Harga Awal"]) * quantity,
      lineGmv,
      lineDiscountAmount: parseNumber(row["Total Diskon"]),
      lineSellerDiscountAmount: parseNumber(row["Diskon Dari Penjual"]),
      linePlatformDiscountAmount: parseNumber(row["Diskon Dari Shopee"]),
      lineGrossProfitAmount: 0,
      skuType,
      isFreeItem: lineGmv === 0 || skuType === "free_gift",
      isBundleComponent: skuType === "bundle",
      isPosm: skuType === "posm",
      rawItemSnapshot: row,
    };
  }

  const lineGmv = parseNumber(row["SKU Subtotal After Discount"]);
  const sourceSkuCode = getRowSourceSku(row, config);
  const productName = cleanText(row["Product Name"]);
  const skuType = inferSkuType(sourceSkuCode, productName, lineGmv);

  return {
    rawLineId,
    sourceLineNumber,
    sourceSkuCode,
    sourceProductName: productName,
    sourceVariationName: cleanText(row.Variation),
    quantity: parseNumber(row.Quantity),
    returnedQuantity: parseNumber(row["Sku Quantity of return"]),
    unitOriginalPrice: parseNumber(row["SKU Unit Original Price"]),
    unitDiscountedPrice: lineGmv,
    lineGrossAmount: parseNumber(row["SKU Subtotal Before Discount"]),
    lineGmv,
    lineDiscountAmount: parseNumber(row["SKU Platform Discount"]) + parseNumber(row["SKU Seller Discount"]),
    lineSellerDiscountAmount: parseNumber(row["SKU Seller Discount"]),
    linePlatformDiscountAmount: parseNumber(row["SKU Platform Discount"]),
    lineGrossProfitAmount: 0,
    skuType,
    isFreeItem: lineGmv === 0 || skuType === "free_gift",
    isBundleComponent: skuType === "bundle",
    isPosm: skuType === "posm",
    rawItemSnapshot: row,
  };
}

function mergeOrder(order: NormalizedOrderDraft, item: NormalizedItemDraft, row: Record<string, unknown>, config: SourceConfig) {
  order.items.push(item);

  if (config.sourceSystem === "b2b_raw_dashboard") {
    order.bookedOrderGmv += item.lineGmv;
    order.orderDiscountAmount += item.lineDiscountAmount;
  } else {
    order.orderDiscountAmount += item.lineDiscountAmount;
  }

  if (order.marketplace) {
    order.marketplace.skuGrossSalesAmount += item.lineGmv;

    if (config.sourceSystem === "tiktok_shop") {
      const refund = parseNumber(row["Order Refund Amount"]);
      order.orderRefundAmount = Math.max(order.orderRefundAmount, refund);
      order.marketplace.refundAmount = Math.max(order.marketplace.refundAmount, refund);
      order.marketplace.sellerDiscountAmount += item.lineSellerDiscountAmount;
      order.marketplace.platformDiscountAmount += item.linePlatformDiscountAmount;
      order.marketplace.voucherAmount += parseNumber(row["Payment platform discount"]);
    } else if (config.sourceSystem === "shopee") {
      order.marketplace.sellerDiscountAmount += item.lineSellerDiscountAmount;
      order.marketplace.platformDiscountAmount += item.linePlatformDiscountAmount;
      order.marketplace.voucherAmount += parseNumber(row["Voucher Ditanggung Penjual"]) + parseNumber(row["Voucher Ditanggung Shopee"]);
    }
  }
}

function finalizeOrder(order: NormalizedOrderDraft) {
  if (order.sourceSystem === "b2b_raw_dashboard") {
    order.activeOrderGmv = isCancelled(order.normalizedStatus) ? 0 : order.bookedOrderGmv;
    return order;
  }

  order.activeOrderGmv = isCancelled(order.normalizedStatus) ? 0 : order.bookedOrderGmv;
  return order;
}

function orderCustomerHash(order: NormalizedOrderDraft) {
  return sha256(
    [
      order.sourceSystem,
      order.shopAccount,
      order.customer.sourceCustomerId,
      order.customer.buyerUsername,
      order.customer.customerName,
      order.customer.recipientName,
      order.customer.piiMask,
    ]
      .map((part) => cleanText(part).toLowerCase())
      .join("|"),
  );
}

function getChannelType(channelGroup: string) {
  if (channelGroup === "GT") return "offline";
  if (channelGroup === "MT") return "agency";
  return "marketplace";
}

function getPlatformName(config: SourceConfig) {
  if (config.sourceSystem === "b2b_raw_dashboard") return "B2B";
  if (config.sourceSystem === "shopee") return "Shopee";
  return "TikTok Shop";
}

async function storeUploadedFile(buffer: Buffer, batchId: string, fileName: string, fileHash: string) {
  const uploadDir = join(process.cwd(), "data", "uploads", batchId);
  await mkdir(uploadDir, { recursive: true });
  const safeName = basename(fileName).replace(/[^a-zA-Z0-9._ -]/g, "_");
  const path = join(uploadDir, `${fileHash.slice(0, 16)}-${safeName}`);
  await writeFile(path, buffer);
  return path;
}

async function seedReferenceData() {
  await db
    .insert(channels)
    .values([
      { channelGroup: "GT", channelName: "General Trade", channelType: "offline", isMarketplace: false },
      { channelGroup: "MT", channelName: "Modern Trade", channelType: "agency", isMarketplace: false },
      { channelGroup: "Marketplace", channelName: "Shopee", channelType: "marketplace", isMarketplace: true },
      { channelGroup: "Marketplace", channelName: "TikTok Shop", channelType: "marketplace", isMarketplace: true },
    ])
    .onConflictDoNothing();

  await db
    .insert(platforms)
    .values([
      { sourceSystem: "b2b_raw_dashboard", platformName: "B2B", shopAccount: "B2B GT/MT" },
      { sourceSystem: "shopee", platformName: "Shopee", shopAccount: "Shopee", marketplaceCode: "shopee" },
      { sourceSystem: "tiktok_shop", platformName: "TikTok Shop", shopAccount: "TikTok Shop (Kayou ID)", marketplaceCode: "tiktok1" },
      { sourceSystem: "tiktok_shop", platformName: "TikTok Shop", shopAccount: "TikTok Shop (Kayou Card ID)", marketplaceCode: "tiktok2" },
    ])
    .onConflictDoNothing();

  await db
    .insert(sourceFieldMappings)
    .values([
      { sourceSystem: "b2b_raw_dashboard", sourceField: "Area Manager", normalizedField: "channel_group", ruleDescription: "Agency maps to MT; all other rows map to GT", isRequired: true },
      { sourceSystem: "b2b_raw_dashboard", sourceField: "bdcity", normalizedField: "channel_group", ruleDescription: "Agency fallback maps to MT when Area Manager is unavailable", isRequired: true },
      { sourceSystem: "b2b_raw_dashboard", sourceField: "recipient addressprovince", normalizedField: "province_standard", ruleDescription: "GT/MT province is taken from recipient address, not BD territory", isRequired: true },
      { sourceSystem: "b2b_raw_dashboard", sourceField: "recipient addresscity", normalizedField: "city_standard", ruleDescription: "GT/MT city is taken from recipient address, not BD territory", isRequired: true },
      { sourceSystem: "b2b_raw_dashboard", sourceField: "SKUGMV sku gmv", normalizedField: "line_gmv", ruleDescription: "B2B GMV source of truth", isRequired: true },
      { sourceSystem: "shopee", sourceField: "Total Pembayaran", normalizedField: "booked_order_gmv", ruleDescription: "Shopee order-level GMV, deduped by No. Pesanan", isRequired: true },
      { sourceSystem: "shopee", sourceField: "Harga Setelah Diskon", normalizedField: "line_gmv", ruleDescription: "Shopee SKU-level GMV = price after discount x quantity", isRequired: true },
      { sourceSystem: "tiktok_shop", sourceField: "Order Amount", normalizedField: "booked_order_gmv", ruleDescription: "TikTok order-level GMV, deduped by Order ID", isRequired: true },
      { sourceSystem: "tiktok_shop", sourceField: "SKU Subtotal After Discount", normalizedField: "line_gmv", ruleDescription: "TikTok SKU-level GMV", isRequired: true },
    ])
    .onConflictDoNothing();
}

export async function resetDashboardData() {
  await db.transaction(async (tx) => {
    await tx.delete(dedupeKeys);
    await tx.delete(cleanedDatasetExports);
    await tx.delete(aiQueryLogs);
    await tx.delete(metricsSnapshots);
    await tx.delete(marketplaceOrders);
    await tx.delete(orderItems);
    await tx.delete(normalizedOrders);
    await tx.delete(rawOrderLines);
    await tx.delete(rawUploadedFiles);
    await tx.delete(uploadBatches);
    await tx.delete(productAliases);
    await tx.delete(products);
    await tx.delete(customers);
    await tx.delete(locations);
    await tx.delete(salesHierarchy);
    await tx.delete(areaManagers);
    await tx.delete(regionalManagers);
    await tx.delete(orderStatuses);
    await tx.delete(platforms);
    await tx.delete(channels);
    await tx.delete(sourceFieldMappings);
  });
}

function uniqueSourceConfigs(configs: SourceConfig[]) {
  const seen = new Set<string>();
  return configs.filter((config) => {
    const key = `${config.sourceSystem}|${config.shopAccount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function replaceDashboardSources(configs: SourceConfig[]) {
  const orderTargets = uniqueSourceConfigs(configs.filter((config) => config.fileKind === "orders"));
  const incomeTargets = uniqueSourceConfigs(configs.filter((config) => config.fileKind === "income"));
  if (!orderTargets.length && !incomeTargets.length) return;

  await db.transaction(async (tx) => {
    const touchedBatchIds = new Set<string>();

    if (incomeTargets.length) {
      const incomeMetricPredicates = incomeTargets.map((config) =>
        and(
          eq(metricsSnapshots.metricName, "released_amount"),
          eq(metricsSnapshots.sourceSystem, config.sourceSystem),
          eq(metricsSnapshots.shopAccount, config.shopAccount),
        ),
      );
      const incomeFilePredicates = incomeTargets.map((config) =>
        and(
          eq(rawUploadedFiles.sourceSystem, config.sourceSystem),
          eq(rawUploadedFiles.shopAccount, config.shopAccount),
        ),
      );

      if (incomeMetricPredicates.length === 1) {
        await tx.delete(metricsSnapshots).where(incomeMetricPredicates[0]);
      } else {
        await tx.delete(metricsSnapshots).where(or(...incomeMetricPredicates));
      }

      const targetIncomeFiles =
        incomeFilePredicates.length === 1
          ? await tx
              .select({ id: rawUploadedFiles.id, batchId: rawUploadedFiles.batchId })
              .from(rawUploadedFiles)
              .where(incomeFilePredicates[0])
          : await tx
              .select({ id: rawUploadedFiles.id, batchId: rawUploadedFiles.batchId })
              .from(rawUploadedFiles)
              .where(or(...incomeFilePredicates));
      const incomeFileIds = targetIncomeFiles.map((file) => file.id);

      targetIncomeFiles.forEach((file) => touchedBatchIds.add(file.batchId));
      if (incomeFileIds.length) {
        await tx.delete(rawOrderLines).where(inArray(rawOrderLines.uploadedFileId, incomeFileIds));
        await tx.delete(rawUploadedFiles).where(inArray(rawUploadedFiles.id, incomeFileIds));
      }
    }

    if (orderTargets.length) {
      const orderPredicates = orderTargets.map((config) =>
        and(
          eq(normalizedOrders.sourceSystem, config.sourceSystem),
          eq(normalizedOrders.shopAccount, config.shopAccount),
        ),
      );
      const filePredicates = orderTargets.map((config) =>
        and(
          eq(rawUploadedFiles.sourceSystem, config.sourceSystem),
          eq(rawUploadedFiles.shopAccount, config.shopAccount),
        ),
      );
      const staleSnapshotPredicates = orderTargets.map((config) =>
        and(
          eq(metricsSnapshots.sourceSystem, config.sourceSystem),
          eq(metricsSnapshots.shopAccount, config.shopAccount),
          sql`${metricsSnapshots.metricName} <> 'released_amount'`,
        ),
      );
      const targetOrders =
        orderPredicates.length === 1
          ? await tx
              .select({
                id: normalizedOrders.id,
                batchId: normalizedOrders.batchId,
                uploadedFileId: normalizedOrders.uploadedFileId,
              })
              .from(normalizedOrders)
              .where(orderPredicates[0])
          : await tx
              .select({
                id: normalizedOrders.id,
                batchId: normalizedOrders.batchId,
                uploadedFileId: normalizedOrders.uploadedFileId,
              })
              .from(normalizedOrders)
              .where(or(...orderPredicates));
      const targetFiles =
        filePredicates.length === 1
          ? await tx
              .select({ id: rawUploadedFiles.id, batchId: rawUploadedFiles.batchId })
              .from(rawUploadedFiles)
              .where(filePredicates[0])
          : await tx
              .select({ id: rawUploadedFiles.id, batchId: rawUploadedFiles.batchId })
              .from(rawUploadedFiles)
              .where(or(...filePredicates));

      const orderIds = targetOrders.map((order) => order.id);
      const fileIds = Array.from(
        new Set([
          ...targetFiles.map((file) => file.id),
          ...targetOrders.map((order) => order.uploadedFileId).filter((id): id is string => Boolean(id)),
        ]),
      );
      const batchIds = Array.from(
        new Set([
          ...targetFiles.map((file) => file.batchId),
          ...targetOrders.map((order) => order.batchId).filter((id): id is string => Boolean(id)),
        ]),
      );

      await tx.delete(cleanedDatasetExports);
      if (staleSnapshotPredicates.length === 1) {
        await tx.delete(metricsSnapshots).where(staleSnapshotPredicates[0]);
      } else {
        await tx.delete(metricsSnapshots).where(or(...staleSnapshotPredicates));
      }

      if (batchIds.length) {
        await tx.delete(dedupeKeys).where(inArray(dedupeKeys.batchId, batchIds));
      }

      if (orderIds.length) {
        await tx.delete(marketplaceOrders).where(inArray(marketplaceOrders.orderId, orderIds));
        await tx.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
        await tx.delete(normalizedOrders).where(inArray(normalizedOrders.id, orderIds));
      }

      if (fileIds.length) {
        await tx.delete(rawOrderLines).where(inArray(rawOrderLines.uploadedFileId, fileIds));
        await tx.delete(rawUploadedFiles).where(inArray(rawUploadedFiles.id, fileIds));
      }

      batchIds.forEach((batchId) => touchedBatchIds.add(batchId));
    }

    const batchIds = Array.from(touchedBatchIds);
    if (batchIds.length) {
      await tx
        .update(uploadBatches)
        .set({
          totalFiles: sql<number>`coalesce((select count(*) from raw_uploaded_files where raw_uploaded_files.batch_id = ${uploadBatches.id}), 0)`,
          totalRawRows: sql<number>`coalesce((select sum(row_count) from raw_uploaded_files where raw_uploaded_files.batch_id = ${uploadBatches.id}), 0)`,
          totalNormalizedOrders: sql<number>`coalesce((select count(*) from normalized_orders where normalized_orders.batch_id = ${uploadBatches.id}), 0)`,
          totalNormalizedItems: sql<number>`coalesce((
            select count(*)
            from order_items
            inner join normalized_orders on normalized_orders.id = order_items.order_id
            where normalized_orders.batch_id = ${uploadBatches.id}
          ), 0)`,
          updatedAt: new Date(),
        })
        .where(inArray(uploadBatches.id, batchIds));

      await tx
        .delete(uploadBatches)
        .where(
          and(
            inArray(uploadBatches.id, batchIds),
            sql`not exists (select 1 from raw_uploaded_files where raw_uploaded_files.batch_id = ${uploadBatches.id})`,
            sql`not exists (select 1 from normalized_orders where normalized_orders.batch_id = ${uploadBatches.id})`,
            sql`not exists (select 1 from metrics_snapshots where metrics_snapshots.batch_id = ${uploadBatches.id})`,
          ),
        );
    }
  });
}

export async function processDashboardFiles(inputs: DashboardFileInput[], options: ProcessDashboardFilesOptions = {}) {
  const parsedFiles = inputs.map(parseWorkbook);
  if (options.replace) {
    await replaceDashboardSources(parsedFiles.map((file) => file.config));
  }

  await seedReferenceData();
  const allDates = parsedFiles.flatMap((file) =>
    file.config.fileKind === "income"
      ? [file.incomeSummary?.periodStart, file.incomeSummary?.periodEnd].filter((date): date is Date => Boolean(date))
      : file.rows
          .map((row) => {
            if (file.config.sourceSystem === "b2b_raw_dashboard") return parseDate(row["order create time"]);
            if (file.config.sourceSystem === "shopee") return parseDate(row["Waktu Pesanan Dibuat"]);
            return parseDate(row["Created Time"]);
          })
          .filter((date): date is Date => Boolean(date)),
  );

  const periodStart = allDates.length ? new Date(Math.min(...allDates.map((date) => date.getTime()))) : null;
  const periodEnd = allDates.length ? new Date(Math.max(...allDates.map((date) => date.getTime()))) : null;

  const [batch] = await db
    .insert(uploadBatches)
    .values({
      id: options.batchId,
      notes: options.notes ?? "Dashboard ingestion",
      periodStart,
      periodEnd,
      processingStatus: "processing",
    })
    .returning();

  const productCache = new Map<string, string>();
  const customerCache = new Map<string, string>();
  const locationCache = new Map<string, string>();
  const channelCache = new Map<string, string>();
  const platformCache = new Map<string, string>();
  const statusCache = new Map<string, string>();
  const regionalCache = new Map<string, string>();
  const areaCache = new Map<string, string>();
  const hierarchyCache = new Map<string, string>();

  let totalRawRows = 0;
  let totalOrders = 0;
  let totalItems = 0;
  let totalReleasedAmount = 0;
  const fileSummaries: Array<Record<string, unknown>> = [];
  const incomeSummaries: Array<Record<string, unknown>> = [];

  await db.transaction(async (tx) => {
    for (const file of parsedFiles) {
      const input = inputs.find((candidate) => candidate.fileName === file.fileName);
      const storedFilePath =
        options.persistFiles && input
          ? await storeUploadedFile(input.buffer, batch.id, file.fileName, file.fileHash)
          : null;

      const schemaDetected = getSchemaDetected(file);

      const [uploadedFile] = await tx
        .insert(rawUploadedFiles)
        .values({
          batchId: batch.id,
          sourceSystem: file.config.sourceSystem,
          shopAccount: file.config.shopAccount,
          channelHint: file.config.channelHint,
          originalFileName: file.fileName,
          storedFilePath,
          fileType: file.fileType,
          fileHash: file.fileHash,
          fileSizeBytes: file.size,
          rowCount: file.rows.length,
          columnCount: file.columns.length,
          schemaDetected,
          parsingStatus: schemaDetected.isValid ? "parsed" : "schema_warning",
        })
        .onConflictDoUpdate({
          target: rawUploadedFiles.fileHash,
          set: {
            batchId: batch.id,
            sourceSystem: file.config.sourceSystem,
            shopAccount: file.config.shopAccount,
            channelHint: file.config.channelHint,
            rowCount: file.rows.length,
            columnCount: file.columns.length,
            schemaDetected,
            parsingStatus: schemaDetected.isValid ? "parsed" : "schema_warning",
            updatedAt: new Date(),
          },
        })
        .returning();

      const rawLineInputs = file.rows.map((row, index) => ({
        uploadedFileId: uploadedFile.id,
        batchId: batch.id,
        rowNumber: index + 1,
        rawPayload: row,
        rowHash: rowHash(row),
        sourceOrderId:
          file.config.fileKind === "income"
            ? dateOnly(file.incomeSummary?.periodStart ?? null) ?? "settlement"
            : getRowSourceOrderId(row, file.config),
        sourceSkuCode: file.config.fileKind === "income" ? "released_amount" : getRowSourceSku(row, file.config),
        validationStatus:
          file.config.fileKind === "income" || (getRowSourceOrderId(row, file.config) && getRowSourceSku(row, file.config))
            ? "valid"
            : "warning",
        validationErrors:
          file.config.fileKind === "income" || (getRowSourceOrderId(row, file.config) && getRowSourceSku(row, file.config))
            ? null
            : { missing: ["source_order_id_or_sku"] },
      }));

      const rawLineIds = new Map<number, string>();
      for (let index = 0; index < rawLineInputs.length; index += 250) {
        const chunk = rawLineInputs.slice(index, index + 250);
        const inserted = await tx
          .insert(rawOrderLines)
          .values(chunk)
          .onConflictDoUpdate({
            target: [rawOrderLines.uploadedFileId, rawOrderLines.rowNumber],
            set: {
              batchId: batch.id,
              rawPayload: sql`excluded.raw_payload`,
              rowHash: sql`excluded.row_hash`,
              sourceOrderId: sql`excluded.source_order_id`,
              sourceSkuCode: sql`excluded.source_sku_code`,
              validationStatus: sql`excluded.validation_status`,
              validationErrors: sql`excluded.validation_errors`,
            },
          })
          .returning({ id: rawOrderLines.id, rowNumber: rawOrderLines.rowNumber });

        inserted.forEach((line) => rawLineIds.set(line.rowNumber, line.id));
      }

      if (file.config.fileKind === "income") {
        const income = file.incomeSummary;
        if (!income?.hasSettlementMetric) {
          throw new Error(`Income file ${file.fileName} does not contain a released amount summary.`);
        }

        await tx.insert(metricsSnapshots).values({
          batchId: batch.id,
          snapshotDate: income.periodEnd ?? income.periodStart ?? new Date(),
          grain: "settlement_period",
          metricName: "released_amount",
          channelGroup: file.config.channelHint,
          sourceSystem: file.config.sourceSystem,
          shopAccount: file.config.shopAccount,
          bookedGmv: income.totalSettlementAmount,
          activeGmv: income.totalSettlementAmount,
          filterContext: {
            fileKind: file.config.sourceHint === "shopee_income" ? "shopee_income" : "tiktok_income",
            sourceSheet: income.sourceSheet,
            periodStart: dateOnly(income.periodStart),
            periodEnd: dateOnly(income.periodEnd),
            totalSettlementAmount: income.totalSettlementAmount,
            totalRevenue: income.totalRevenue,
            totalFees: income.totalFees,
            originalFileName: file.fileName,
          },
        });

        totalRawRows += file.rows.length;
        totalReleasedAmount += income.totalSettlementAmount;
        const incomeFileSummary = {
          fileName: file.fileName,
          sourceSystem: file.config.sourceSystem,
          shopAccount: file.config.shopAccount,
          rows: file.rows.length,
          orders: 0,
          columns: file.columns.length,
          schemaDetected,
          releasedAmount: income.totalSettlementAmount,
          periodStart: dateOnly(income.periodStart),
          periodEnd: dateOnly(income.periodEnd),
        };
        fileSummaries.push(incomeFileSummary);
        incomeSummaries.push(incomeFileSummary);
        continue;
      }

      const orders = new Map<string, NormalizedOrderDraft>();
      file.rows.forEach((row, index) => {
        const sourceOrderId = getRowSourceOrderId(row, file.config);
        if (!sourceOrderId) return;

        const orderKey = `${file.config.sourceSystem}|${file.config.shopAccount}|${sourceOrderId}`;
        const rawLineId = rawLineIds.get(index + 1);
        const item = createItemDraft(row, file.config, index + 1, rawLineId);
        const existing = orders.get(orderKey);

        if (existing) {
          mergeOrder(existing, item, row, file.config);
        } else {
          const order = createOrderDraft(row, file.config);
          mergeOrder(order, item, row, file.config);
          orders.set(orderKey, order);
        }
      });

      async function ensureChannel(order: NormalizedOrderDraft) {
        const key = `${order.channelGroup}|${order.channelName}`;
        const cached = channelCache.get(key);
        if (cached) return cached;

        const [record] = await tx
          .insert(channels)
          .values({
            channelGroup: order.channelGroup,
            channelName: order.channelName,
            channelType: getChannelType(order.channelGroup),
            isMarketplace: order.channelGroup === "Marketplace",
          })
          .onConflictDoUpdate({
            target: [channels.channelGroup, channels.channelName],
            set: { isActive: true, updatedAt: new Date() },
          })
          .returning({ id: channels.id });

        channelCache.set(key, record.id);
        return record.id;
      }

      async function ensurePlatform(order: NormalizedOrderDraft) {
        const key = `${order.sourceSystem}|${order.shopAccount}`;
        const cached = platformCache.get(key);
        if (cached) return cached;

        const [record] = await tx
          .insert(platforms)
          .values({
            sourceSystem: order.sourceSystem,
            platformName: getPlatformName(file.config),
            shopAccount: order.shopAccount,
            marketplaceCode: file.config.sourceHint,
          })
          .onConflictDoUpdate({
            target: [platforms.sourceSystem, platforms.shopAccount],
            set: { platformName: getPlatformName(file.config), updatedAt: new Date() },
          })
          .returning({ id: platforms.id });

        platformCache.set(key, record.id);
        return record.id;
      }

      async function ensureStatus(order: NormalizedOrderDraft) {
        const key = `${order.sourceSystem}|${order.orderStatusRaw}|${order.orderSubstatusRaw}`;
        const cached = statusCache.get(key);
        if (cached) return cached;

        const [record] = await tx
          .insert(orderStatuses)
          .values({
            sourceSystem: order.sourceSystem,
            rawStatus: order.orderStatusRaw || "Unknown",
            rawSubstatus: order.orderSubstatusRaw || "",
            normalizedStatus: order.normalizedStatus,
            isCancelled: isCancelled(order.normalizedStatus),
            isCompleted: order.normalizedStatus === "completed",
            isActiveGmvEligible: !isCancelled(order.normalizedStatus),
          })
          .onConflictDoUpdate({
            target: [orderStatuses.sourceSystem, orderStatuses.rawStatus, orderStatuses.rawSubstatus],
            set: {
              normalizedStatus: order.normalizedStatus,
              isCancelled: isCancelled(order.normalizedStatus),
              isCompleted: order.normalizedStatus === "completed",
              isActiveGmvEligible: !isCancelled(order.normalizedStatus),
              updatedAt: new Date(),
            },
          })
          .returning({ id: orderStatuses.id });

        statusCache.set(key, record.id);
        return record.id;
      }

      async function ensureCustomer(order: NormalizedOrderDraft) {
        const hash = orderCustomerHash(order);
        const cached = customerCache.get(hash);
        if (cached) return cached;

        const [record] = await tx
          .insert(customers)
          .values({
            customerIdentityHash: hash,
            sourceCustomerId: order.customer.sourceCustomerId,
            customerName: order.customer.customerName,
            buyerUsername: order.customer.buyerUsername,
            recipientName: order.customer.recipientName,
            customerType: order.channelGroup === "MT" ? "agency" : "unknown",
            piiMask: order.customer.piiMask,
          })
          .onConflictDoUpdate({
            target: customers.customerIdentityHash,
            set: {
              customerName: order.customer.customerName,
              buyerUsername: order.customer.buyerUsername,
              recipientName: order.customer.recipientName,
              updatedAt: new Date(),
            },
          })
          .returning({ id: customers.id });

        customerCache.set(hash, record.id);
        return record.id;
      }

      async function ensureLocation(order: NormalizedOrderDraft) {
        const province = normalizeProvince(order.provinceRaw);
        const city = normalizeCityStandard(order.cityRaw);
        const key = `${province}|${city}|${cleanText(order.districtRaw)}|${cleanText(order.villageRaw)}`;
        const cached = locationCache.get(key);
        if (cached) return cached;

        const [record] = await tx
          .insert(locations)
          .values({
            provinceRaw: order.provinceRaw,
            cityRaw: order.cityRaw,
            districtRaw: order.districtRaw,
            villageRaw: order.villageRaw,
            provinceStandard: province,
            cityStandard: city,
          })
          .returning({ id: locations.id });

        locationCache.set(key, record.id);
        return record.id;
      }

      async function ensureSalesHierarchy(order: NormalizedOrderDraft) {
        if (!order.sales) return null;

        const regionalName = order.sales.regionalManager || "Unassigned";
        const regionalId = regionalCache.get(regionalName) ?? (
          await tx
            .insert(regionalManagers)
            .values({ managerName: regionalName })
            .onConflictDoUpdate({
              target: regionalManagers.managerName,
              set: { isActive: true, updatedAt: new Date() },
            })
            .returning({ id: regionalManagers.id })
        )[0].id;
        regionalCache.set(regionalName, regionalId);

        const areaName = order.sales.areaManager || "Unassigned";
        const areaKey = `${regionalId}|${areaName}`;
        const areaId = areaCache.get(areaKey) ?? (
          await tx
            .insert(areaManagers)
            .values({
              regionalManagerId: regionalId,
              managerName: areaName,
              isAgency: order.sales.isAgency,
            })
            .onConflictDoUpdate({
              target: [areaManagers.regionalManagerId, areaManagers.managerName],
              set: { isAgency: order.sales.isAgency, updatedAt: new Date() },
            })
            .returning({ id: areaManagers.id })
        )[0].id;
        areaCache.set(areaKey, areaId);

        const hierarchyKey = [
          regionalName,
          areaName,
          order.sales.bdName,
          order.sales.bdWorkcode,
          order.sales.bdCity,
          order.sales.bdProvince,
        ]
          .map((value) => cleanText(value).toLowerCase())
          .join("|");
        const cached = hierarchyCache.get(hierarchyKey);
        if (cached) return cached;

        const [record] = await tx
          .insert(salesHierarchy)
          .values({
            regionalManagerId: regionalId,
            areaManagerId: areaId,
            bdName: order.sales.bdName,
            bdWorkcode: order.sales.bdWorkcode,
            bdCity: order.sales.bdCity,
            bdProvince: order.sales.bdProvince,
            hierarchyKey,
            isAgency: order.sales.isAgency,
          })
          .onConflictDoUpdate({
            target: salesHierarchy.hierarchyKey,
            set: {
              regionalManagerId: regionalId,
              areaManagerId: areaId,
              isAgency: order.sales.isAgency,
              updatedAt: new Date(),
            },
          })
          .returning({ id: salesHierarchy.id });

        hierarchyCache.set(hierarchyKey, record.id);
        return record.id;
      }

      async function ensureProduct(item: NormalizedItemDraft, sourceSystem: string) {
        const canonicalSkuCode = item.sourceSkuCode || `UNKNOWN-${sha256(item.sourceProductName).slice(0, 12)}`;
        const cached = productCache.get(canonicalSkuCode);
        if (cached) return cached;

        const [record] = await tx
          .insert(products)
          .values({
            canonicalSkuCode,
            barcode: /^\d{8,}$/.test(canonicalSkuCode.split("*")[0]) ? canonicalSkuCode.split("*")[0] : null,
            productName: item.sourceProductName || canonicalSkuCode,
            skuName: item.sourceVariationName || item.sourceProductName,
            skuType: item.skuType,
            ipName: inferIpName(item.sourceProductName),
            packSize: inferPackSize(canonicalSkuCode, item.sourceProductName),
          })
          .onConflictDoUpdate({
            target: products.canonicalSkuCode,
            set: {
              productName: item.sourceProductName || canonicalSkuCode,
              skuName: item.sourceVariationName || item.sourceProductName,
              skuType: item.skuType,
              updatedAt: new Date(),
            },
          })
          .returning({ id: products.id });

        await tx
          .insert(productAliases)
          .values({
            productId: record.id,
            sourceSystem,
            sourceSkuCode: item.sourceSkuCode || canonicalSkuCode,
            sourceProductName: item.sourceProductName,
            sourceVariationName: item.sourceVariationName || "",
            aliasConfidence: 1,
          })
          .onConflictDoNothing();

        productCache.set(canonicalSkuCode, record.id);
        return record.id;
      }

      for (const order of Array.from(orders.values()).map(finalizeOrder)) {
        const channelId = await ensureChannel(order);
        const platformId = await ensurePlatform(order);
        const customerId = await ensureCustomer(order);
        const locationId = await ensureLocation(order);
        const statusId = await ensureStatus(order);
        const salesHierarchyId = await ensureSalesHierarchy(order);

        const [normalizedOrder] = await tx
          .insert(normalizedOrders)
          .values({
            orderKey: order.orderKey,
            sourceSystem: order.sourceSystem,
            shopAccount: order.shopAccount,
            sourceOrderId: order.sourceOrderId,
            batchId: batch.id,
            uploadedFileId: uploadedFile.id,
            channelId,
            platformId,
            customerId,
            locationId,
            statusId,
            salesHierarchyId,
            orderCreatedAt: order.orderCreatedAt,
            paidAt: order.paidAt,
            shippedAt: order.shippedAt,
            deliveredAt: order.deliveredAt,
            cancelledAt: order.cancelledAt,
            normalizedStatus: order.normalizedStatus,
            channelGroup: order.channelGroup,
            bookedOrderGmv: order.bookedOrderGmv,
            activeOrderGmv: order.activeOrderGmv,
            orderPaidAmount: order.orderPaidAmount,
            orderPayableAmount: order.orderPayableAmount,
            orderDiscountAmount: order.orderDiscountAmount,
            orderRefundAmount: order.orderRefundAmount,
            shippingFeeAmount: order.shippingFeeAmount,
            paymentMethod: order.paymentMethod,
            dedupeHash: orderDedupeHash(order.sourceSystem, order.shopAccount, order.sourceOrderId),
            rawOrderSnapshot: order.rawOrderSnapshot,
          })
          .onConflictDoUpdate({
            target: normalizedOrders.orderKey,
            set: {
              batchId: batch.id,
              uploadedFileId: uploadedFile.id,
              channelId,
              platformId,
              customerId,
              locationId,
              statusId,
              salesHierarchyId,
              orderCreatedAt: order.orderCreatedAt,
              paidAt: order.paidAt,
              shippedAt: order.shippedAt,
              deliveredAt: order.deliveredAt,
              cancelledAt: order.cancelledAt,
              normalizedStatus: order.normalizedStatus,
              channelGroup: order.channelGroup,
              bookedOrderGmv: order.bookedOrderGmv,
              activeOrderGmv: order.activeOrderGmv,
              orderPaidAmount: order.orderPaidAmount,
              orderPayableAmount: order.orderPayableAmount,
              orderDiscountAmount: order.orderDiscountAmount,
              orderRefundAmount: order.orderRefundAmount,
              shippingFeeAmount: order.shippingFeeAmount,
              paymentMethod: order.paymentMethod,
              rawOrderSnapshot: order.rawOrderSnapshot,
              updatedAt: new Date(),
            },
          })
          .returning();

        for (const item of order.items) {
          const productId = await ensureProduct(item, order.sourceSystem);
          await tx
            .insert(orderItems)
            .values({
              orderId: normalizedOrder.id,
              rawLineId: item.rawLineId,
              productId,
              sourceLineNumber: item.sourceLineNumber,
              sourceSkuCode: item.sourceSkuCode || "UNKNOWN",
              sourceProductName: item.sourceProductName,
              quantity: item.quantity,
              returnedQuantity: item.returnedQuantity,
              unitOriginalPrice: item.unitOriginalPrice,
              unitDiscountedPrice: item.unitDiscountedPrice,
              lineGrossAmount: item.lineGrossAmount,
              lineGmv: item.lineGmv,
              lineDiscountAmount: item.lineDiscountAmount,
              lineSellerDiscountAmount: item.lineSellerDiscountAmount,
              linePlatformDiscountAmount: item.linePlatformDiscountAmount,
              lineGrossProfitAmount: item.lineGrossProfitAmount,
              skuType: item.skuType,
              isFreeItem: item.isFreeItem,
              isBundleComponent: item.isBundleComponent,
              isPosm: item.isPosm,
              itemDedupeHash: itemDedupeHash(order.orderKey, item.sourceSkuCode, item.sourceLineNumber),
              rawItemSnapshot: item.rawItemSnapshot,
            })
            .onConflictDoUpdate({
              target: orderItems.itemDedupeHash,
              set: {
                productId,
                quantity: item.quantity,
                lineGmv: item.lineGmv,
                skuType: item.skuType,
                isFreeItem: item.isFreeItem,
                isBundleComponent: item.isBundleComponent,
                isPosm: item.isPosm,
                updatedAt: new Date(),
              },
            });
        }

        if (order.marketplace) {
          await tx
            .insert(marketplaceOrders)
            .values({
              orderId: normalizedOrder.id,
              platformId,
              marketplaceStatusRaw: order.marketplace.marketplaceStatusRaw,
              paymentStatusRaw: order.marketplace.paymentStatusRaw,
              fulfillmentStatusRaw: order.marketplace.fulfillmentStatusRaw,
              cancellationReason: order.marketplace.cancellationReason,
              refundStatus: order.marketplace.refundStatus,
              refundAmount: order.marketplace.refundAmount,
              skuGrossSalesAmount: order.marketplace.skuGrossSalesAmount,
              sellerDiscountAmount: order.marketplace.sellerDiscountAmount,
              platformDiscountAmount: order.marketplace.platformDiscountAmount,
              voucherAmount: order.marketplace.voucherAmount,
              logisticsProvider: order.marketplace.logisticsProvider,
              trackingNumber: order.marketplace.trackingNumber,
            })
            .onConflictDoUpdate({
              target: marketplaceOrders.orderId,
              set: {
                refundAmount: order.marketplace.refundAmount,
                skuGrossSalesAmount: order.marketplace.skuGrossSalesAmount,
                sellerDiscountAmount: order.marketplace.sellerDiscountAmount,
                platformDiscountAmount: order.marketplace.platformDiscountAmount,
                voucherAmount: order.marketplace.voucherAmount,
                updatedAt: new Date(),
              },
            });
        }
      }

      totalRawRows += file.rows.length;
      totalOrders += orders.size;
      totalItems += file.rows.length;
      fileSummaries.push({
        fileName: file.fileName,
        sourceSystem: file.config.sourceSystem,
        shopAccount: file.config.shopAccount,
        rows: file.rows.length,
        orders: orders.size,
        columns: file.columns.length,
        schemaDetected,
      });
    }

    await tx
      .update(uploadBatches)
      .set({
        totalFiles: parsedFiles.length,
        totalRawRows,
        totalNormalizedOrders: totalOrders,
        totalNormalizedItems: totalItems,
        processingStatus: "ready",
        validationSummary: {
          files: fileSummaries,
          totalRawRows,
          totalOrders,
          totalItems,
          totalReleasedAmount,
          incomeSnapshots: incomeSummaries,
        },
        updatedAt: new Date(),
      })
      .where(eq(uploadBatches.id, batch.id));
  });

  return {
    batchId: batch.id,
    periodStart,
    periodEnd,
    totalFiles: parsedFiles.length,
    totalRawRows,
    totalNormalizedOrders: totalOrders,
    totalNormalizedItems: totalItems,
    totalReleasedAmount,
    incomeSnapshots: incomeSummaries,
    files: fileSummaries,
  };
}

function inferPackSize(sku: string, productName: string) {
  const fromSku = sku.match(/\*(\d+)/)?.[1];
  if (fromSku) return Number(fromSku);

  const fromName = productName.match(/\b(\d+)\s*(?:pack|paket|pcs|piece|box)\b/i)?.[1];
  return fromName ? Number(fromName) : null;
}

function inferIpName(productName: string) {
  const text = productName.toLowerCase();
  if (text.includes("mobile legends") || text.includes("mlbb")) return "MLBB";
  if (text.includes("naruto")) return "Naruto";
  if (text.includes("my little pony") || text.includes("ponny")) return "My Little Pony";
  if (text.includes("free fire")) return "Free Fire";
  return null;
}

export function buildExportFileName(prefix: string, extension: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export function buildSourceLabel(sourceSystem: string, shopAccount: string, channelGroup: string) {
  return sourceLabel(sourceSystem, shopAccount, channelGroup);
}

export function normalizeDashboardCity(value: unknown) {
  return normalizeCityStandard(value);
}

export function normalizeDashboardProvince(value: unknown) {
  return normalizeProvince(value);
}

export function cleanDashboardText(value: unknown) {
  return cleanText(value);
}

export function parseDashboardNumber(value: unknown) {
  return parseNumber(value);
}
