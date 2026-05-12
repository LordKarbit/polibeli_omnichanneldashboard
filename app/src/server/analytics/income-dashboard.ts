import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { metricsSnapshots, rawOrderLines, rawUploadedFiles } from "@/server/db/schema";
import { cleanDashboardText, parseDashboardNumber } from "@/server/ingestion/dashboard-ingestion";

type IncomeSourceKey = "shopee" | "tiktok1" | "tiktok2";

type RawIncomePayload = {
  sheetName?: string;
  rowNumber?: number;
  rowType?: string;
  label?: string;
  value?: string | number;
  cells?: unknown[];
  fields?: Record<string, unknown> | null;
};

type IncomeRawRow = {
  sourceKey: IncomeSourceKey;
  sourceName: string;
  sourceSystem: string;
  shopAccount: string;
  fileName: string;
  sheetName: string;
  rowNumber: number;
  rowType: string;
  payload: RawIncomePayload;
  fields: Record<string, unknown>;
  cells: string[];
};

function sourceKeyFromFile(sourceSystem: string, shopAccount: string): IncomeSourceKey {
  if (sourceSystem === "shopee_income" || shopAccount.toLowerCase().includes("shopee")) return "shopee";
  if (shopAccount.toLowerCase().includes("card")) return "tiktok2";
  return "tiktok1";
}

function sourceName(key: IncomeSourceKey) {
  return {
    shopee: "Shopee",
    tiktok1: "TikTok Shop (Kayou ID)",
    tiktok2: "TikTok Shop (Kayou Card ID)",
  }[key];
}

function sourceColor(key: IncomeSourceKey) {
  return {
    shopee: "#f97316",
    tiktok1: "#ef4444",
    tiktok2: "#ec4899",
  }[key];
}

function toNumber(value: unknown) {
  return parseDashboardNumber(value);
}

function toDateOnly(value: unknown) {
  const text = cleanDashboardText(value);
  if (!text) return null;
  const normalized = text.replace(/\//g, "-");
  const date = new Date(`${normalized}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? normalized.slice(0, 10) : new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function getField(fields: Record<string, unknown>, ...names: string[]) {
  const entries = Object.entries(fields);
  for (const name of names) {
    const target = cleanDashboardText(name).toLowerCase();
    const exact = entries.find(([key]) => cleanDashboardText(key).toLowerCase() === target);
    if (exact) return exact[1];
  }
  for (const name of names) {
    const target = cleanDashboardText(name).toLowerCase();
    const fuzzy = entries.find(([key]) => cleanDashboardText(key).toLowerCase().includes(target));
    if (fuzzy) return fuzzy[1];
  }
  return "";
}

function summaryRows(rows: IncomeRawRow[]) {
  return rows.filter((row) => !row.fields || !Object.keys(row.fields).length || row.rowType === "summary");
}

function lastNonEmpty(values: unknown[]) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const text = cleanDashboardText(values[index]);
    if (text) return text;
  }
  return "";
}

function summaryValue(rows: IncomeRawRow[], ...labels: string[]) {
  const labelSet = labels.map((label) => cleanDashboardText(label).replace(/^\d+\.\s*/, "").toLowerCase());
  const row = summaryRows(rows).find((candidate) => {
    const haystack = cleanDashboardText(candidate.payload.label || candidate.cells.join(" ")).replace(/^\d+\.\s*/, "").toLowerCase();
    return labelSet.some((label) => haystack === label || haystack.includes(label));
  });
  return toNumber(row?.payload.value ?? lastNonEmpty(row?.cells ?? []));
}

function periodFromRows(rows: IncomeRawRow[]) {
  const from = summaryRows(rows).find((row) => cleanDashboardText(row.cells[0]).replace(/:$/, "").toLowerCase() === "from")?.cells[1];
  const to = summaryRows(rows).find((row) => cleanDashboardText(row.cells[0]).replace(/:$/, "").toLowerCase() === "to")?.cells[1];
  const timePeriod = lastNonEmpty(summaryRows(rows).find((row) => cleanDashboardText(row.cells[0]).replace(/:$/, "").toLowerCase() === "time period")?.cells ?? []);

  if (from || to) return { start: toDateOnly(from), end: toDateOnly(to) };
  if (timePeriod) {
    const [start, end] = cleanDashboardText(timePeriod).split(/\s*-\s*/);
    return { start: toDateOnly(start), end: toDateOnly(end) };
  }
  return { start: null, end: null };
}

function uniqueCount(values: unknown[]) {
  return new Set(values.map(cleanDashboardText).filter(Boolean)).size;
}

function sumBy<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function addMapValue(map: Map<string, number>, key: string, value: number) {
  if (!key || !Number.isFinite(value)) return;
  map.set(key, (map.get(key) ?? 0) + value);
}

function mapToRows(map: Map<string, number>, source?: string) {
  return Array.from(map.entries())
    .map(([name, value]) => ({ source, name, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

const shopeeFeeFields = [
  "AMS Commission Fee",
  "Commission fee",
  "Service Fee",
  "Seller Order Processing Fee",
  "Premium",
  "Shipping Fee Saver Program",
  "Transaction Fee",
  "Campaign Fee",
  "Custom Tax",
  "Ads Escrow Top Up Fee",
];

const tiktokFeeFields = [
  "Platform commission fee",
  "Pre-order service fee",
  "Mall service fee",
  "Payment Fee",
  "Credit card installment - Handling fee",
  "Shipping cost",
  "Affiliate Commission",
];

function rowLabel(row: IncomeRawRow) {
  return cleanDashboardText(row.payload.label || row.cells.filter(Boolean).slice(0, -1).join(" / "));
}

export async function getIncomeDashboardData() {
  const [rawRows, snapshots] = await Promise.all([
    db
      .select({
        sourceSystem: rawUploadedFiles.sourceSystem,
        shopAccount: rawUploadedFiles.shopAccount,
        fileName: rawUploadedFiles.originalFileName,
        rowNumber: rawOrderLines.rowNumber,
        rawPayload: rawOrderLines.rawPayload,
      })
      .from(rawOrderLines)
      .innerJoin(rawUploadedFiles, eq(rawOrderLines.uploadedFileId, rawUploadedFiles.id))
      .where(inArray(rawUploadedFiles.sourceSystem, ["shopee_income", "tiktok_income"]))
      .orderBy(desc(rawUploadedFiles.createdAt), rawOrderLines.rowNumber),
    db
      .select({
        sourceSystem: metricsSnapshots.sourceSystem,
        shopAccount: metricsSnapshots.shopAccount,
        activeGmv: metricsSnapshots.activeGmv,
        bookedGmv: metricsSnapshots.bookedGmv,
        filterContext: metricsSnapshots.filterContext,
        createdAt: metricsSnapshots.createdAt,
      })
      .from(metricsSnapshots)
      .where(eq(metricsSnapshots.metricName, "released_amount"))
      .orderBy(desc(metricsSnapshots.createdAt)),
  ]);

  const rows: IncomeRawRow[] = rawRows.map((row) => {
    const payload = (row.rawPayload ?? {}) as RawIncomePayload;
    const sourceKey = sourceKeyFromFile(row.sourceSystem, row.shopAccount ?? "");
    return {
      sourceKey,
      sourceName: sourceName(sourceKey),
      sourceSystem: row.sourceSystem,
      shopAccount: row.shopAccount ?? sourceName(sourceKey),
      fileName: row.fileName,
      sheetName: cleanDashboardText(payload.sheetName) || "Unknown",
      rowNumber: Number(payload.rowNumber ?? row.rowNumber ?? 0),
      rowType: cleanDashboardText(payload.rowType) || "summary",
      payload,
      fields: (payload.fields ?? {}) as Record<string, unknown>,
      cells: (payload.cells ?? []).map(cleanDashboardText),
    };
  });

  const rowsBySource = new Map<IncomeSourceKey, IncomeRawRow[]>();
  rows.forEach((row) => {
    const current = rowsBySource.get(row.sourceKey) ?? [];
    current.push(row);
    rowsBySource.set(row.sourceKey, current);
  });

  const snapshotBySource = new Map<IncomeSourceKey, (typeof snapshots)[number]>();
  snapshots.forEach((snapshot) => {
    const key = sourceKeyFromFile(snapshot.sourceSystem ?? "", snapshot.shopAccount ?? "");
    if (!snapshotBySource.has(key)) snapshotBySource.set(key, snapshot);
  });

  const sourceOrder = ["shopee", "tiktok1", "tiktok2"] as IncomeSourceKey[];
  const sources = sourceOrder
    .map((key) => {
      const sourceRows = rowsBySource.get(key) ?? [];
      const snapshot = snapshotBySource.get(key);
      const context = snapshot?.filterContext ?? {};
      const period = periodFromRows(sourceRows);
      const sourceSummaryRows = summaryRows(sourceRows)
        .map((row) => ({
          source: sourceName(key),
          sheet: row.sheetName,
          label: rowLabel(row),
          value: toNumber(row.payload.value ?? lastNonEmpty(row.cells)),
        }))
        .filter((row) => row.label && Number.isFinite(row.value));

      const incomeRows = sourceRows.filter((row) => row.sheetName === "Income" && row.rowType === "table" && cleanDashboardText(getField(row.fields, "Order ID")));
      const tiktokOrderRows = sourceRows.filter((row) => row.sheetName === "Order details" && row.rowType === "table" && cleanDashboardText(getField(row.fields, "Order/adjustment ID")));
      const detailRows = key === "shopee" ? incomeRows : tiktokOrderRows;
      const withdrawalRows = sourceRows.filter((row) => row.sheetName === "Withdrawal records" && row.rowType === "table");

      const totalRevenue =
        Number(context.totalRevenue ?? 0) ||
        summaryValue(sourceRows, "Total Revenue");
      const totalFees =
        Number(context.totalFees ?? 0) ||
        summaryValue(sourceRows, "Total Fees", "Total Expenses");
      const releasedAmount =
        Number(snapshot?.activeGmv || snapshot?.bookedGmv || 0) ||
        summaryValue(sourceRows, "Total Released Amount", "Total settlement amount");
      const grossSubtotal =
        summaryValue(sourceRows, "Subtotal before discounts", "Merchandise Subtotal") ||
        sumBy(detailRows, (row) => toNumber(getField(row.fields, "Original product price", "Subtotal before discounts")));
      const sellerDiscounts =
        summaryValue(sourceRows, "Seller discounts", "Your Seller product promotion") ||
        sumBy(detailRows, (row) => toNumber(getField(row.fields, "Your Seller product promotion", "Seller discounts")));
      const refunds =
        summaryValue(sourceRows, "Refund Amount", "Refund subtotal after seller discounts") ||
        sumBy(detailRows, (row) => toNumber(getField(row.fields, "Refund Amount", "Refund subtotal after seller discounts")));
      const adjustmentAmount = summaryValue(sourceRows, "Total Adjustment Amount") ||
        sumBy(sourceRows.filter((row) => row.sheetName === "Adjustment" && row.rowType === "table"), (row) => toNumber(getField(row.fields, "Adjustment Amount")));
      const orderCount = uniqueCount(detailRows.map((row) => getField(row.fields, "Order ID", "Order/adjustment ID")));
      const buyerCount = uniqueCount(detailRows.map((row) => getField(row.fields, "Username (Buyer)")));
      const withdrawalAmount = sumBy(withdrawalRows, (row) => toNumber(getField(row.fields, "Amount")));

      return {
        key,
        source: sourceName(key),
        color: sourceColor(key),
        fileNames: Array.from(new Set(sourceRows.map((row) => row.fileName))),
        periodStart: period.start || cleanDashboardText(context.periodStart) || null,
        periodEnd: period.end || cleanDashboardText(context.periodEnd) || null,
        releasedAmount,
        totalRevenue,
        totalFees,
        grossSubtotal,
        sellerDiscounts,
        refunds,
        adjustmentAmount,
        orderCount,
        buyerCount,
        withdrawalAmount,
        rowCount: sourceRows.length,
        detailRowCount: detailRows.length,
        feeRate: totalRevenue ? Math.abs(totalFees) / totalRevenue : 0,
        releaseRate: totalRevenue ? releasedAmount / totalRevenue : 0,
        summaryRows: sourceSummaryRows,
      };
    })
    .filter((source) => source.rowCount > 0 || source.releasedAmount > 0);

  const summary = {
    totalReleased: sumBy(sources, (source) => source.releasedAmount),
    totalRevenue: sumBy(sources, (source) => source.totalRevenue),
    totalFees: sumBy(sources, (source) => source.totalFees),
    totalOrders: sumBy(sources, (source) => source.orderCount),
    totalBuyers: sumBy(sources, (source) => source.buyerCount),
    totalAdjustments: sumBy(sources, (source) => source.adjustmentAmount),
    totalWithdrawals: sumBy(sources, (source) => source.withdrawalAmount),
  };

  const feeMap = new Map<string, number>();
  const dailyMap = new Map<string, Record<string, number | string>>();
  const paymentMethodMap = new Map<string, number>();
  const courierMap = new Map<string, number>();
  const settlementSourceMap = new Map<string, { sourceKey: IncomeSourceKey; source: string; orderSource: string; orders: Set<string>; releasedAmount: number }>();
  const topOrders: Array<{ source: string; orderId: string; buyer: string; date: string | null; releasedAmount: number; paymentMethod: string; courier: string }> = [];
  const sellerFeeProductMap = new Map<string, { source: string; sourceKey: IncomeSourceKey; productName: string; orderCount: Set<string>; feeAmount: number }>();
  const adjustments: Array<{ source: string; sourceKey: IncomeSourceKey; date: string | null; type: string; reason: string; amount: number; orderId: string }> = [];
  const shippingDiscrepancies: Array<{ source: string; sourceKey: IncomeSourceKey; orderId: string; expectedFee: number; actualFee: number; variance: number; reason: string }> = [];
  const withdrawalRecords: Array<{ source: string; type: string; referenceId: string; requestTime: string | null; amount: number; status: string; successTime: string | null; bankAccount: string }> = [];

  function addSettlementSource(row: IncomeRawRow, orderSource: string, orderId: string, released: number) {
    const normalizedOrderSource = cleanDashboardText(orderSource) || row.sourceName;
    const key = `${row.sourceKey}|${normalizedOrderSource}`;
    const current = settlementSourceMap.get(key) ?? {
      sourceKey: row.sourceKey,
      source: row.sourceName,
      orderSource: normalizedOrderSource,
      orders: new Set<string>(),
      releasedAmount: 0,
    };
    if (orderId) current.orders.add(orderId);
    current.releasedAmount += released;
    settlementSourceMap.set(key, current);
  }

  rows.forEach((row) => {
    if (row.rowType !== "table") return;

    const source = row.sourceName;
    if (row.sheetName === "Income") {
      const released = toNumber(getField(row.fields, "Total Released Amount (Rp)"));
      const date = toDateOnly(getField(row.fields, "Payout Completed Date"));
      const day = date ?? "Unknown";
      const current = dailyMap.get(day) ?? { date: day, shopee: 0, tiktok1: 0, tiktok2: 0, total: 0 };
      current[row.sourceKey] = Number(current[row.sourceKey] ?? 0) + released;
      current.total = Number(current.total ?? 0) + released;
      dailyMap.set(day, current);

      addMapValue(paymentMethodMap, cleanDashboardText(getField(row.fields, "Buyer Payment Method")) || "Unknown", released);
      addMapValue(courierMap, cleanDashboardText(getField(row.fields, "Courier Name", "Shipping provider")) || "Unknown", released);
      shopeeFeeFields.forEach((field) => addMapValue(feeMap, `${source}|${field}`, toNumber(getField(row.fields, field))));
      const orderId = cleanDashboardText(getField(row.fields, "Order ID"));
      addSettlementSource(row, "Shopee", orderId, released);
      topOrders.push({
        source,
        orderId,
        buyer: cleanDashboardText(getField(row.fields, "Username (Buyer)")),
        date,
        releasedAmount: released,
        paymentMethod: cleanDashboardText(getField(row.fields, "Buyer Payment Method")),
        courier: cleanDashboardText(getField(row.fields, "Courier Name", "Shipping provider")),
      });
    }

    if (row.sheetName === "Order details") {
      const released = toNumber(getField(row.fields, "Total settlement amount"));
      const date = toDateOnly(getField(row.fields, "Order settled time"));
      const day = date ?? "Unknown";
      const current = dailyMap.get(day) ?? { date: day, shopee: 0, tiktok1: 0, tiktok2: 0, total: 0 };
      current[row.sourceKey] = Number(current[row.sourceKey] ?? 0) + released;
      current.total = Number(current.total ?? 0) + released;
      dailyMap.set(day, current);
      tiktokFeeFields.forEach((field) => addMapValue(feeMap, `${source}|${field}`, toNumber(getField(row.fields, field))));
      const orderId = cleanDashboardText(getField(row.fields, "Order/adjustment ID"));
      addSettlementSource(row, cleanDashboardText(getField(row.fields, "Order Source")) || source, orderId, released);
      topOrders.push({
        source,
        orderId,
        buyer: "-",
        date,
        releasedAmount: released,
        paymentMethod: "-",
        courier: "-",
      });
    }

    if (row.sheetName === "Seller Fee") {
      const productName = cleanDashboardText(getField(row.fields, "Product Name"));
      const orderId = cleanDashboardText(getField(row.fields, "Order ID"));
      const lineType = cleanDashboardText(getField(row.fields, "Line Type"));
      if (productName && productName !== "-" && lineType.toLowerCase() === "sku") {
        const current = sellerFeeProductMap.get(productName) ?? { source, sourceKey: row.sourceKey, productName, orderCount: new Set<string>(), feeAmount: 0 };
        current.orderCount.add(orderId);
        current.feeAmount +=
          toNumber(getField(row.fields, "Seller Order Processing Fee")) +
          toNumber(getField(row.fields, "Biaya Layanan Gratis Ongkir XTRA (Kategori E)")) +
          toNumber(getField(row.fields, "Biaya Layanan Gratis Ongkir XTRA (Kategori H)")) +
          toNumber(getField(row.fields, "Biaya Layanan Promo XTRA"));
        sellerFeeProductMap.set(productName, current);
      }
    }

    if (row.sheetName === "Adjustment") {
      const amount = toNumber(getField(row.fields, "Adjustment Amount"));
      const sequenceNo = cleanDashboardText(getField(row.fields, "Sequence No."));
      if (amount && /^\d+$/.test(sequenceNo)) {
        adjustments.push({
          source,
          sourceKey: row.sourceKey,
          date: toDateOnly(getField(row.fields, "Adjustment Complete Date")),
          type: cleanDashboardText(getField(row.fields, "Adjustment Type | Description")),
          reason: cleanDashboardText(getField(row.fields, "Adjustment Reason")),
          amount,
          orderId: cleanDashboardText(getField(row.fields, "Linked Order No.")),
        });
      }
    }

    if (row.sheetName === "Shipping Fee Discrepancy") {
      const expectedFee = toNumber(getField(row.fields, "Expected Shipping Fee"));
      const actualFee = toNumber(getField(row.fields, "Actual Shipping Fee Charged by Logistic Provider"));
      const orderId = cleanDashboardText(getField(row.fields, "Order ID"));
      if (orderId) {
        shippingDiscrepancies.push({
          source,
          sourceKey: row.sourceKey,
          orderId,
          expectedFee,
          actualFee,
          variance: actualFee - expectedFee,
          reason: cleanDashboardText(getField(row.fields, "Discrepancy reason")),
        });
      }
    }

    if (row.sheetName === "Withdrawal records") {
      withdrawalRecords.push({
        source,
        type: cleanDashboardText(getField(row.fields, "Type")),
        referenceId: cleanDashboardText(getField(row.fields, "Reference ID")),
        requestTime: toDateOnly(getField(row.fields, "Request time")),
        amount: toNumber(getField(row.fields, "Amount")),
        status: cleanDashboardText(getField(row.fields, "Status")),
        successTime: toDateOnly(getField(row.fields, "Success time")),
        bankAccount: cleanDashboardText(getField(row.fields, "Bank account")),
      });
    }
  });

  sources.forEach((source) => {
    source.summaryRows
      .filter((row) =>
        /fee|commission|premium|shipping cost|service|expense|ads|transaction/i.test(row.label) &&
        row.value !== 0,
      )
      .forEach((row) => addMapValue(feeMap, `${source.source}|${row.label.replace(/^\d+\.\s*/, "")}`, row.value));
  });

  const feeComponents = Array.from(feeMap.entries())
    .map(([key, value]) => {
      const [source, ...nameParts] = key.split("|");
      return { source, name: nameParts.join("|"), value, absoluteValue: Math.abs(value) };
    })
    .filter((row) => row.value !== 0)
    .sort((a, b) => b.absoluteValue - a.absoluteValue)
    .slice(0, 30);

  const dailyReleased = Array.from(dailyMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const settlementSourceMix = Array.from(settlementSourceMap.values())
    .map((row) => ({
      sourceKey: row.sourceKey,
      source: row.source,
      orderSource: row.orderSource,
      orders: row.orders.size,
      releasedAmount: row.releasedAmount,
    }))
    .sort((a, b) => Math.abs(b.releasedAmount) - Math.abs(a.releasedAmount));
  const sellerFeeProducts = Array.from(sellerFeeProductMap.values())
    .map((row) => ({ source: row.source, sourceKey: row.sourceKey, productName: row.productName, orders: row.orderCount.size, feeAmount: row.feeAmount }))
    .sort((a, b) => Math.abs(b.feeAmount) - Math.abs(a.feeAmount))
    .slice(0, 25);

  const reportCatalog = [
    { report: "Executive Income Summary", coverage: "All 3 files", rows: sources.length, purpose: "Revenue, released amount, fees, and release-rate comparison." },
    { report: "Shopee Income Detail", coverage: "Shopee Income sheet", rows: rows.filter((row) => row.sheetName === "Income" && row.rowType === "table").length, purpose: "Order-level payout, buyer, payment method, courier, refund, and fee analysis." },
    { report: "Shopee Seller Fee", coverage: "Shopee Seller Fee sheet", rows: rows.filter((row) => row.sheetName === "Seller Fee" && row.rowType === "table").length, purpose: "Product and order-level processing and promo fee leakage." },
    { report: "Shopee Adjustment", coverage: "Shopee Adjustment sheet", rows: adjustments.length, purpose: "Manual compensation and linked-order adjustment tracking." },
    { report: "Shopee Shipping Discrepancy", coverage: "Shopee Shipping Fee Discrepancy sheet", rows: shippingDiscrepancies.length, purpose: "Expected vs actual logistic charge variance monitoring." },
    { report: "TikTok Settlement Report", coverage: "TikTok Reports + Order details", rows: rows.filter((row) => row.sourceKey !== "shopee").length, purpose: "Settlement amount, revenue, fee, refund, and withdrawal monitoring by TikTok account." },
  ];

  return {
    hasData: sources.length > 0,
    generatedAt: new Date().toISOString(),
    summary: {
      ...summary,
      feeRate: summary.totalRevenue ? Math.abs(summary.totalFees) / summary.totalRevenue : 0,
      releaseRate: summary.totalRevenue ? summary.totalReleased / summary.totalRevenue : 0,
    },
    sources,
    sourceComparison: sources.map((source) => ({
      source: source.source,
      key: source.key,
      color: source.color,
      releasedAmount: source.releasedAmount,
      totalRevenue: source.totalRevenue,
      totalFees: source.totalFees,
      grossSubtotal: source.grossSubtotal,
      sellerDiscounts: source.sellerDiscounts,
      refunds: source.refunds,
      orderCount: source.orderCount,
      buyerCount: source.buyerCount,
      feeRate: source.feeRate,
      releaseRate: source.releaseRate,
    })),
    feeComponents,
    dailyReleased,
    settlementSourceMix,
    paymentMethods: mapToRows(paymentMethodMap, "Shopee").slice(0, 12),
    courierMix: mapToRows(courierMap, "Shopee").slice(0, 12),
    topOrders: topOrders.sort((a, b) => b.releasedAmount - a.releasedAmount).slice(0, 25),
    sellerFeeProducts,
    adjustments: adjustments.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    shippingDiscrepancies: shippingDiscrepancies.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
    withdrawalRecords,
    reportCatalog,
  };
}

export type IncomeDashboardData = Awaited<ReturnType<typeof getIncomeDashboardData>>;
