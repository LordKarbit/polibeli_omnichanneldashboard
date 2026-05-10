import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  areaManagers,
  customers,
  locations,
  marketplaceOrders,
  normalizedOrders,
  orderItems,
  products,
  rawUploadedFiles,
  regionalManagers,
  salesHierarchy,
  uploadBatches,
} from "@/server/db/schema";
import { buildSourceLabel, cleanDashboardText } from "@/server/ingestion/dashboard-ingestion";

export interface AnalyticsFilters {
  start?: string | null;
  end?: string | null;
  channels?: string[];
  channelGroup?: string | null;
  shopAccount?: string | null;
  status?: string | null;
  includeCancelled?: boolean;
  regionalManager?: string | null;
  areaManager?: string | null;
  province?: string | null;
  city?: string | null;
  skuType?: string | null;
  search?: string | null;
}

interface JoinedRow {
  orderId: string;
  orderKey: string;
  sourceOrderId: string;
  sourceSystem: string;
  shopAccount: string;
  channelGroup: string;
  normalizedStatus: string;
  orderCreatedAt: Date | null;
  bookedOrderGmv: number;
  activeOrderGmv: number;
  orderRefundAmount: number;
  paymentMethod: string | null;
  customerId: string | null;
  customerName: string | null;
  buyerUsername: string | null;
  recipientName: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  regionalManager: string | null;
  areaManager: string | null;
  bdName: string | null;
  itemId: string | null;
  sourceSkuCode: string | null;
  productName: string | null;
  canonicalSkuCode: string | null;
  skuType: string | null;
  quantity: number | null;
  lineGmv: number | null;
  isFreeItem: boolean | null;
  isPosm: boolean | null;
  marketplaceRefundAmount: number | null;
  skuGrossSalesAmount: number | null;
  cancellationReason: string | null;
}

function channelKey(row: Pick<JoinedRow, "channelGroup" | "shopAccount" | "sourceSystem">) {
  if (row.channelGroup === "GT") return "gt";
  if (row.channelGroup === "MT") return "mt";
  if (row.sourceSystem === "shopee") return "shopee";
  if (row.shopAccount.toLowerCase().includes("card")) return "tiktok2";
  return "tiktok1";
}

function channelName(key: string) {
  return (
    {
      gt: "GT",
      mt: "MT",
      shopee: "Shopee",
      tiktok1: "TikTok Shop (Kayou ID)",
      tiktok2: "TikTok Shop (Kayou Card ID)",
    }[key] ?? key
  );
}

function parseFilters(searchParams: URLSearchParams): AnalyticsFilters {
  const channels = searchParams.get("channels")?.split(",").map((value) => value.trim()).filter(Boolean);
  const includeCancelled =
    searchParams.get("includeCancelled") === "true" ||
    searchParams.get("excludeCancelled") === "false" ||
    (!searchParams.has("includeCancelled") && !searchParams.has("excludeCancelled"));

  return {
    start: searchParams.get("start"),
    end: searchParams.get("end"),
    channels,
    channelGroup: searchParams.get("channelGroup"),
    shopAccount: searchParams.get("shopAccount"),
    status: searchParams.get("status"),
    includeCancelled,
    regionalManager: searchParams.get("regionalManager"),
    areaManager: searchParams.get("areaManager"),
    province: searchParams.get("province"),
    city: searchParams.get("city"),
    skuType: searchParams.get("skuType"),
    search: searchParams.get("search"),
  };
}

function isAll(value?: string | null) {
  return !value || value === "All" || value === "all";
}

function toDateOnly(date: Date | null) {
  return date ? new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : "Unknown";
}

function toMonthKey(date: Date | null) {
  return date ? new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7) : "Unknown";
}

function monthLabel(month: string) {
  if (month === "Unknown") return month;
  const [year, monthNumber] = month.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const index = Number(monthNumber) - 1;
  return `${monthNames[index] ?? monthNumber} ${year}`;
}

function isCancelled(status: string) {
  return status === "cancelled" || status === "returned" || status === "refunded";
}

function isExcludedGiveawaySku(row: Pick<JoinedRow, "sourceSkuCode" | "productName" | "canonicalSkuCode" | "skuType">) {
  const text = cleanDashboardText(
    [row.sourceSkuCode, row.productName, row.canonicalSkuCode, row.skuType].filter(Boolean).join(" "),
  ).toLowerCase();

  return (
    text.includes("scrach card") ||
    text.includes("scratch card") ||
    (text.includes("poster") && text.includes("posm")) ||
    (text.includes("mlbb") && text.includes("display rack"))
  );
}

function matchesFilters(row: JoinedRow, filters: AnalyticsFilters) {
  const key = channelKey(row);
  const search = filters.search?.toLowerCase();

  if (filters.channels?.length && !filters.channels.includes(key)) return false;
  if (!isAll(filters.channelGroup) && row.channelGroup !== filters.channelGroup) return false;
  if (!isAll(filters.shopAccount) && row.shopAccount !== filters.shopAccount) return false;
  if (!isAll(filters.status) && row.normalizedStatus !== filters.status) return false;
  if (filters.includeCancelled === false && isCancelled(row.normalizedStatus)) return false;
  if (!isAll(filters.regionalManager) && row.regionalManager !== filters.regionalManager) return false;
  if (!isAll(filters.areaManager) && row.areaManager !== filters.areaManager) return false;
  if (!isAll(filters.province) && row.province !== filters.province) return false;
  if (!isAll(filters.city) && row.city !== filters.city) return false;
  if (!isAll(filters.skuType) && row.skuType !== filters.skuType) return false;

  if (filters.start && row.orderCreatedAt && row.orderCreatedAt < new Date(`${filters.start}T00:00:00+07:00`)) return false;
  if (filters.end && row.orderCreatedAt && row.orderCreatedAt > new Date(`${filters.end}T23:59:59+07:00`)) return false;

  if (search) {
    const haystack = [
      row.sourceOrderId,
      row.shopAccount,
      row.channelGroup,
      row.normalizedStatus,
      row.province,
      row.city,
      row.regionalManager,
      row.areaManager,
      row.sourceSkuCode,
      row.productName,
      row.customerName,
      row.buyerUsername,
    ]
      .map((value) => cleanDashboardText(value).toLowerCase())
      .join(" ");
    if (!haystack.includes(search)) return false;
  }

  return true;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sourceShort(row: Pick<JoinedRow, "sourceSystem" | "shopAccount" | "channelGroup">) {
  return buildSourceLabel(row.sourceSystem, row.shopAccount, row.channelGroup);
}

export async function getDashboardData(searchParams = new URLSearchParams()) {
  const filters = parseFilters(searchParams);

  const rows = (await db
    .select({
      orderId: normalizedOrders.id,
      orderKey: normalizedOrders.orderKey,
      sourceOrderId: normalizedOrders.sourceOrderId,
      sourceSystem: normalizedOrders.sourceSystem,
      shopAccount: normalizedOrders.shopAccount,
      channelGroup: normalizedOrders.channelGroup,
      normalizedStatus: normalizedOrders.normalizedStatus,
      orderCreatedAt: normalizedOrders.orderCreatedAt,
      bookedOrderGmv: normalizedOrders.bookedOrderGmv,
      activeOrderGmv: normalizedOrders.activeOrderGmv,
      orderRefundAmount: normalizedOrders.orderRefundAmount,
      paymentMethod: normalizedOrders.paymentMethod,
      customerId: normalizedOrders.customerId,
      customerName: customers.customerName,
      buyerUsername: customers.buyerUsername,
      recipientName: customers.recipientName,
      province: locations.provinceStandard,
      city: locations.cityStandard,
      district: locations.districtRaw,
      regionalManager: regionalManagers.managerName,
      areaManager: areaManagers.managerName,
      bdName: salesHierarchy.bdName,
      itemId: orderItems.id,
      sourceSkuCode: orderItems.sourceSkuCode,
      productName: orderItems.sourceProductName,
      canonicalSkuCode: products.canonicalSkuCode,
      skuType: orderItems.skuType,
      quantity: orderItems.quantity,
      lineGmv: orderItems.lineGmv,
      isFreeItem: orderItems.isFreeItem,
      isPosm: orderItems.isPosm,
      marketplaceRefundAmount: marketplaceOrders.refundAmount,
      skuGrossSalesAmount: marketplaceOrders.skuGrossSalesAmount,
      cancellationReason: marketplaceOrders.cancellationReason,
    })
    .from(normalizedOrders)
    .leftJoin(orderItems, eq(orderItems.orderId, normalizedOrders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(customers, eq(normalizedOrders.customerId, customers.id))
    .leftJoin(locations, eq(normalizedOrders.locationId, locations.id))
    .leftJoin(salesHierarchy, eq(normalizedOrders.salesHierarchyId, salesHierarchy.id))
    .leftJoin(regionalManagers, eq(salesHierarchy.regionalManagerId, regionalManagers.id))
    .leftJoin(areaManagers, eq(salesHierarchy.areaManagerId, areaManagers.id))
    .leftJoin(marketplaceOrders, eq(marketplaceOrders.orderId, normalizedOrders.id))) as JoinedRow[];

  const filteredRows = rows.filter((row) => matchesFilters(row, filters));

  const orderMap = new Map<string, JoinedRow>();
  filteredRows.forEach((row) => {
    if (!orderMap.has(row.orderId)) orderMap.set(row.orderId, row);
  });
  const allItemRows = filteredRows.filter((row) => row.itemId);
  const excludedGiveawayItems = allItemRows.filter((row) => isExcludedGiveawaySku(row));
  const itemRows = allItemRows.filter((row) => !isExcludedGiveawaySku(row));
  const orderIdsWithItems = new Set(allItemRows.map((row) => row.orderId));
  const reportingOrderIds = new Set(itemRows.map((row) => row.orderId));
  const orders = Array.from(orderMap.values()).filter(
    (order) => reportingOrderIds.has(order.orderId) || !orderIdsWithItems.has(order.orderId),
  );
  const itemMetricsByOrder = itemRows.reduce(
    (map, item) => {
      const current = map.get(item.orderId) ?? { gmv: 0, quantity: 0, lineItems: 0 };
      current.gmv += Number(item.lineGmv ?? 0);
      current.quantity += Number(item.quantity ?? 0);
      current.lineItems += 1;
      map.set(item.orderId, current);
      return map;
    },
    new Map<string, { gmv: number; quantity: number; lineItems: number }>(),
  );
  const orderBookedGMV = (order: JoinedRow) =>
    itemMetricsByOrder.has(order.orderId) ? itemMetricsByOrder.get(order.orderId)!.gmv : order.bookedOrderGmv;
  const orderActiveGMV = (order: JoinedRow) =>
    isCancelled(order.normalizedStatus)
      ? 0
      : itemMetricsByOrder.has(order.orderId)
        ? itemMetricsByOrder.get(order.orderId)!.gmv
        : order.activeOrderGmv;
  const orderRefundValue = (order: JoinedRow) =>
    Math.min(
      Math.max(Number(order.orderRefundAmount ?? 0), Number(order.marketplaceRefundAmount ?? 0)),
      Math.max(0, orderBookedGMV(order)),
    );

  const totalBooked = sum(orders.map((order) => orderBookedGMV(order)));
  const totalActive = sum(orders.map((order) => orderActiveGMV(order)));
  const totalRefund = sum(orders.map((order) => orderRefundValue(order)));
  const cancelledOrders = orders.filter((order) => isCancelled(order.normalizedStatus));
  const activeOrders = orders.filter((order) => !isCancelled(order.normalizedStatus));

  const summary = {
    bookedGMV: totalBooked,
    activeGMV: totalActive,
    refundAmount: totalRefund,
    discountAmount: sum(itemRows.map((row) => Number(row.lineGmv ?? 0))) - totalActive,
    orders: orders.length,
    activeOrders: activeOrders.length,
    cancelledOrders: cancelledOrders.length,
    rawRows: itemRows.length,
    lineItems: itemRows.length,
    quantity: sum(itemRows.map((row) => Number(row.quantity ?? 0))),
    customers: new Set(orders.map((order) => order.customerId).filter(Boolean)).size,
    aov: orders.length ? totalBooked / orders.length : 0,
    cancellationRate: orders.length ? (cancelledOrders.length / orders.length) * 100 : 0,
    dateRange: {
      start: toDateOnly(orders.map((order) => order.orderCreatedAt).filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0] ?? null),
      end: toDateOnly(orders.map((order) => order.orderCreatedAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null),
    },
  };

  const channelMap = new Map<string, {
    key: string;
    channel: string;
    sourceSystem: string;
    shopAccount: string;
    channelGroup: string;
    orders: Set<string>;
    activeOrders: Set<string>;
    cancelledOrders: Set<string>;
    bookedGMV: number;
    activeGMV: number;
    refundAmount: number;
    quantity: number;
    lineItems: number;
  }>();

  orders.forEach((order) => {
    const key = channelKey(order);
    const current = channelMap.get(key) ?? {
      key,
      channel: channelName(key),
      sourceSystem: order.sourceSystem,
      shopAccount: order.shopAccount,
      channelGroup: order.channelGroup,
      orders: new Set<string>(),
      activeOrders: new Set<string>(),
      cancelledOrders: new Set<string>(),
      bookedGMV: 0,
      activeGMV: 0,
      refundAmount: 0,
      quantity: 0,
      lineItems: 0,
    };
    current.orders.add(order.orderId);
    if (isCancelled(order.normalizedStatus)) current.cancelledOrders.add(order.orderId);
    else current.activeOrders.add(order.orderId);
    current.bookedGMV += orderBookedGMV(order);
    current.activeGMV += orderActiveGMV(order);
    current.refundAmount += orderRefundValue(order);
    channelMap.set(key, current);
  });

  itemRows.forEach((item) => {
    const current = channelMap.get(channelKey(item));
    if (!current) return;
    current.quantity += Number(item.quantity ?? 0);
    current.lineItems += 1;
  });

  const channelsData = Array.from(channelMap.values())
    .map((channel) => ({
      channelKey: channel.key,
      channel: channel.channel,
      sourceSystem: channel.sourceSystem,
      shopAccount: channel.shopAccount,
      channelGroup: channel.channelGroup,
      orders: channel.orders.size,
      activeOrders: channel.activeOrders.size,
      cancelledOrders: channel.cancelledOrders.size,
      bookedGMV: channel.bookedGMV,
      activeGMV: channel.activeGMV,
      refundAmount: channel.refundAmount,
      quantity: channel.quantity,
      lineItems: channel.lineItems,
      aov: channel.orders.size ? channel.bookedGMV / channel.orders.size : 0,
      cancellationRate: channel.orders.size ? (channel.cancelledOrders.size / channel.orders.size) * 100 : 0,
      percentage: totalBooked ? (channel.bookedGMV / totalBooked) * 100 : 0,
    }))
    .sort((a, b) => b.bookedGMV - a.bookedGMV);

  const dailyMap = new Map<string, Record<string, number | string>>();
  orders.forEach((order) => {
    const date = toDateOnly(order.orderCreatedAt);
    const key = channelKey(order);
    const current = dailyMap.get(date) ?? {
      date,
      gt: 0,
      mt: 0,
      shopee: 0,
      tiktok1: 0,
      tiktok2: 0,
      bookedGMV: 0,
      activeGMV: 0,
      orders: 0,
    };
    current[key] = Number(current[key] ?? 0) + orderBookedGMV(order);
    current.bookedGMV = Number(current.bookedGMV) + orderBookedGMV(order);
    current.activeGMV = Number(current.activeGMV) + orderActiveGMV(order);
    current.orders = Number(current.orders) + 1;
    dailyMap.set(date, current);
  });

  const dailyGMV = Array.from(dailyMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));

  function aggregateManagers(level: "regional" | "area") {
    const managerMap = new Map<string, {
      name: string;
      parentManager?: string;
      orders: Set<string>;
      activeOrders: Set<string>;
      bookedGMV: number;
      activeGMV: number;
      quantity: number;
      customers: Set<string>;
    }>();

    orders
      .filter((order) => order.channelGroup === "GT")
      .forEach((order) => {
        const name = level === "regional" ? order.regionalManager : order.areaManager;
        if (!name) return;
        const current = managerMap.get(name) ?? {
          name,
          parentManager: order.regionalManager ?? undefined,
          orders: new Set<string>(),
          activeOrders: new Set<string>(),
          bookedGMV: 0,
          activeGMV: 0,
          quantity: 0,
          customers: new Set<string>(),
        };
        current.orders.add(order.orderId);
        if (!isCancelled(order.normalizedStatus)) current.activeOrders.add(order.orderId);
        current.bookedGMV += orderBookedGMV(order);
        current.activeGMV += orderActiveGMV(order);
        if (order.customerId) current.customers.add(order.customerId);
        managerMap.set(name, current);
      });

    itemRows
      .filter((item) => item.channelGroup === "GT")
      .forEach((item) => {
        const name = level === "regional" ? item.regionalManager : item.areaManager;
        if (!name) return;
        const current = managerMap.get(name);
        if (current) current.quantity += Number(item.quantity ?? 0);
      });

    const totalGT = sum(Array.from(managerMap.values()).map((manager) => manager.bookedGMV));
    return Array.from(managerMap.values())
      .map((manager) => ({
        name: manager.name,
        parentManager: manager.parentManager,
        role: level === "regional" ? "regional_manager" : "area_manager",
        orders: manager.orders.size,
        activeOrders: manager.activeOrders.size,
        bookedGMV: manager.bookedGMV,
        activeGMV: manager.activeGMV,
        quantity: manager.quantity,
        customers: manager.customers.size,
        percentageOfGT: totalGT ? (manager.bookedGMV / totalGT) * 100 : 0,
      }))
      .sort((a, b) => b.bookedGMV - a.bookedGMV);
  }

  const skuMap = new Map<string, {
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
    orders: Set<string>;
    zeroValueItems: number;
  }>();

  itemRows.forEach((item) => {
    const skuCode = item.canonicalSkuCode || item.sourceSkuCode || "UNKNOWN";
    const current = skuMap.get(skuCode) ?? {
      skuCode,
      skuName: item.productName || skuCode,
      skuType: item.skuType || "unknown",
      totalGMV: 0,
      gtGMV: 0,
      mtGMV: 0,
      shopee: 0,
      tiktok1: 0,
      tiktok2: 0,
      quantity: 0,
      orders: new Set<string>(),
      zeroValueItems: 0,
    };
    const value = Number(item.lineGmv ?? 0);
    current.totalGMV += value;
    current.quantity += Number(item.quantity ?? 0);
    current.orders.add(item.orderId);
    if (value === 0 || item.isFreeItem) current.zeroValueItems += 1;
    const key = channelKey(item);
    if (key === "gt") current.gtGMV += value;
    else if (key === "mt") current.mtGMV += value;
    else if (key === "shopee") current.shopee += value;
    else if (key === "tiktok1") current.tiktok1 += value;
    else if (key === "tiktok2") current.tiktok2 += value;
    skuMap.set(skuCode, current);
  });

  const skus = Array.from(skuMap.values())
    .map((sku) => ({ ...sku, orders: sku.orders.size }))
    .sort((a, b) => b.totalGMV - a.totalGMV);

  const locationMap = new Map<string, {
    source: string;
    channelKey: string;
    province: string;
    city: string;
    district: string | null;
    regionalManager: string | null;
    areaManager: string | null;
    orders: Set<string>;
    gmv: number;
    activeGMV: number;
    cancellationValue: number;
  }>();

  orders.forEach((order) => {
    const source = sourceShort(order);
    const province = order.province ?? "Unknown";
    const city = order.city ?? "Unknown";
    const district = order.district ?? null;
    const regionalManager = order.regionalManager ?? null;
    const areaManager = order.areaManager ?? null;
    const key = `${source}|${province}|${city}|${district ?? ""}|${regionalManager ?? ""}|${areaManager ?? ""}`;
    const current = locationMap.get(key) ?? {
      source,
      channelKey: channelKey(order),
      province,
      city,
      district,
      regionalManager,
      areaManager,
      orders: new Set<string>(),
      gmv: 0,
      activeGMV: 0,
      cancellationValue: 0,
    };
    current.orders.add(order.orderId);
    current.gmv += orderBookedGMV(order);
    current.activeGMV += orderActiveGMV(order);
    current.cancellationValue += isCancelled(order.normalizedStatus) ? orderBookedGMV(order) : 0;
    locationMap.set(key, current);
  });

  const locationsData = Array.from(locationMap.values())
    .map((location) => ({
      ...location,
      orders: location.orders.size,
    }))
    .sort((a, b) => b.gmv - a.gmv);

  const statusMap = new Map<string, {
    source: string;
    status: string;
    orders: number;
    gmv: number;
  }>();
  orders.forEach((order) => {
    const key = `${sourceShort(order)}|${order.normalizedStatus}`;
    const current = statusMap.get(key) ?? {
      source: sourceShort(order),
      status: order.normalizedStatus,
      orders: 0,
      gmv: 0,
    };
    current.orders += 1;
    current.gmv += orderBookedGMV(order);
    statusMap.set(key, current);
  });

  const statuses = Array.from(statusMap.values()).map((status) => {
    const sourceTotal = orders.filter((order) => sourceShort(order) === status.source).length || 1;
    return {
      ...status,
      percentWithinSource: (status.orders / sourceTotal) * 100,
    };
  });

  const uploads = await db
    .select({
      id: rawUploadedFiles.id,
      fileName: rawUploadedFiles.originalFileName,
      sourceSystem: rawUploadedFiles.sourceSystem,
      shopAccount: rawUploadedFiles.shopAccount,
      rows: rawUploadedFiles.rowCount,
      columns: rawUploadedFiles.columnCount,
      status: rawUploadedFiles.parsingStatus,
      createdAt: rawUploadedFiles.createdAt,
      schemaDetected: rawUploadedFiles.schemaDetected,
    })
    .from(rawUploadedFiles)
    .orderBy(desc(rawUploadedFiles.createdAt));

  const batches = await db
    .select()
    .from(uploadBatches)
    .orderBy(desc(uploadBatches.createdAt))
    .limit(10);

  const rawCount = await db.select({ count: sql<number>`count(*)` }).from(rawUploadedFiles);

  const duplicateOrderRows = Math.max(0, allItemRows.length - orders.length);
  const zeroValueItems = itemRows.filter((item) => Number(item.lineGmv ?? 0) === 0 || item.isFreeItem);
  const missingOrderRows = filteredRows.filter((row) => !row.sourceOrderId).length;
  const invalidGMVRows = itemRows.filter((item) => Number(item.lineGmv ?? 0) < 0).length;
  const schemaWarnings = uploads.reduce((total, upload) => {
    const detected = upload.schemaDetected as { missing?: string[] } | null;
    return total + (detected?.missing?.length ?? 0);
  }, 0);

  const dataQuality = {
    totalRows: itemRows.length,
    validRows: Math.max(0, itemRows.length - missingOrderRows - invalidGMVRows),
    validPercent: itemRows.length ? round(((itemRows.length - missingOrderRows - invalidGMVRows) / itemRows.length) * 100, 1) : 0,
    criticalIssues: missingOrderRows + invalidGMVRows,
    warningIssues: duplicateOrderRows + zeroValueItems.length + schemaWarnings,
    infoIssues: cancelledOrders.length + excludedGiveawayItems.length,
    metrics: [
      { category: "Repeated order-level rows", count: duplicateOrderRows, severity: "warning", description: "Line-item exports repeat order-level fields; deduplication is active for order metrics." },
      { category: "Zero-value / gift items", count: zeroValueItems.length, severity: "warning", description: "Rows with Rp 0 GMV are tagged as free gift or bundle support." },
      { category: "Excluded giveaway/POSM SKU rows", count: excludedGiveawayItems.length, severity: "info", description: "Scrach/Scratch Card, Poster POSM, and MLBB Display Rack are excluded from reporting GMV." },
      { category: "Cancelled orders", count: cancelledOrders.length, severity: "info", description: "Booked GMV is retained; Active GMV excludes cancelled/refunded orders." },
      { category: "Missing order ID", count: missingOrderRows, severity: "error", description: "Rows without source order ID cannot be normalized reliably." },
      { category: "Invalid negative GMV", count: invalidGMVRows, severity: "error", description: "Negative line GMV should be reviewed before management reporting." },
      { category: "Schema warnings", count: schemaWarnings, severity: "warning", description: "Missing required columns by source schema detection." },
    ],
    zeroValueItems: Array.from(
      zeroValueItems.reduce((map, item) => {
        const key = `${sourceShort(item)}|${item.productName || item.sourceSkuCode}`;
        const current = map.get(key) ?? {
          source: sourceShort(item),
          productName: item.productName || item.sourceSkuCode || "Unknown",
          count: 0,
          totalQty: 0,
        };
        current.count += 1;
        current.totalQty += Number(item.quantity ?? 0);
        map.set(key, current);
        return map;
      }, new Map<string, { source: string; productName: string; count: number; totalQty: number }>()).values(),
    ).sort((a, b) => b.count - a.count),
    schemaMismatches: uploads.flatMap((upload) => {
      const detected = upload.schemaDetected as { missing?: string[] } | null;
      return (detected?.missing ?? []).map((field) => ({
        file: upload.fileName,
        field,
        issue: "Required source column is missing from uploaded file.",
        severity: "error" as const,
      }));
    }),
  };

  const recentOrders = orders
    .slice()
    .sort((a, b) => (b.orderCreatedAt?.getTime() ?? 0) - (a.orderCreatedAt?.getTime() ?? 0))
    .slice(0, 250)
    .map((order) => ({
      orderKey: order.orderKey,
      sourceOrderId: order.sourceOrderId,
      source: sourceShort(order),
      shopAccount: order.shopAccount,
      channelGroup: order.channelGroup,
      status: order.normalizedStatus,
      orderCreatedAt: order.orderCreatedAt?.toISOString() ?? null,
      bookedGMV: orderBookedGMV(order),
      activeGMV: orderActiveGMV(order),
      refundAmount: orderRefundValue(order),
      province: order.province,
      city: order.city,
      regionalManager: order.regionalManager,
      areaManager: order.areaManager,
      customer: order.customerName || order.buyerUsername || order.recipientName,
      cancellationReason: order.cancellationReason,
    }));

  const geoTransactions = orders
    .slice()
    .sort((a, b) => (b.orderCreatedAt?.getTime() ?? 0) - (a.orderCreatedAt?.getTime() ?? 0))
    .map((order) => ({
      orderKey: order.orderKey,
      sourceOrderId: order.sourceOrderId,
      source: sourceShort(order),
      channelKey: channelKey(order),
      channel: channelName(channelKey(order)),
      shopAccount: order.shopAccount,
      channelGroup: order.channelGroup,
      status: order.normalizedStatus,
      orderCreatedAt: order.orderCreatedAt?.toISOString() ?? null,
      bookedGMV: orderBookedGMV(order),
      activeGMV: orderActiveGMV(order),
      refundAmount: orderRefundValue(order),
      province: order.province,
      city: order.city,
      district: order.district,
      regionalManager: order.regionalManager,
      areaManager: order.areaManager,
      salesName: order.bdName,
      customer: order.customerName || order.buyerUsername || order.recipientName,
      cancellationReason: order.cancellationReason,
    }));

  const retentionMap = new Map<string, {
    customer: string;
    channel: string;
    channelKey: string;
    orders: Set<string>;
    totalGMV: number;
    firstOrder: Date | null;
    lastOrder: Date | null;
  }>();

  orders.forEach((order) => {
    const customer = cleanDashboardText(order.customerName || order.buyerUsername || order.recipientName || order.customerId);
    if (!customer) return;

    const key = `${channelKey(order)}|${customer.toLowerCase()}`;
    const current = retentionMap.get(key) ?? {
      customer,
      channel: sourceShort(order),
      channelKey: channelKey(order),
      orders: new Set<string>(),
      totalGMV: 0,
      firstOrder: null,
      lastOrder: null,
    };

    current.orders.add(order.orderId);
    current.totalGMV += orderBookedGMV(order);
    if (order.orderCreatedAt) {
      if (!current.firstOrder || order.orderCreatedAt < current.firstOrder) current.firstOrder = order.orderCreatedAt;
      if (!current.lastOrder || order.orderCreatedAt > current.lastOrder) current.lastOrder = order.orderCreatedAt;
    }
    retentionMap.set(key, current);
  });

  const customerRetention = Array.from(retentionMap.values())
    .map((customer) => ({
      customer: customer.customer,
      channel: customer.channel,
      channelKey: customer.channelKey,
      orders: customer.orders.size,
      totalGMV: customer.totalGMV,
      firstOrder: customer.firstOrder?.toISOString() ?? null,
      lastOrder: customer.lastOrder?.toISOString() ?? null,
    }))
    .filter((customer) => customer.orders > 1)
    .sort((a, b) => b.orders - a.orders || b.totalGMV - a.totalGMV)
    .slice(0, 250);

  type RetentionCustomerAccumulator = {
    customer: string;
    channel: string;
    channelKey: string;
    month?: string;
    orders: Set<string>;
    totalGMV: number;
    firstOrder: Date | null;
    lastOrder: Date | null;
  };

  type RetentionBucketTotals = {
    oneTimeCustomers: number;
    twoTimeCustomers: number;
    threeToFiveCustomers: number;
    sixPlusCustomers: number;
  };

  function emptyRetentionBuckets(): RetentionBucketTotals {
    return {
      oneTimeCustomers: 0,
      twoTimeCustomers: 0,
      threeToFiveCustomers: 0,
      sixPlusCustomers: 0,
    };
  }

  function addRetentionBucket(buckets: RetentionBucketTotals, purchaseCount: number) {
    if (purchaseCount <= 1) buckets.oneTimeCustomers += 1;
    else if (purchaseCount === 2) buckets.twoTimeCustomers += 1;
    else if (purchaseCount <= 5) buckets.threeToFiveCustomers += 1;
    else buckets.sixPlusCustomers += 1;
  }

  function retentionSegment(purchaseCount: number) {
    if (purchaseCount <= 1) return "One-time";
    if (purchaseCount === 2) return "Repeat 2x";
    if (purchaseCount <= 5) return "Repeat 3-5x";
    return "Repeat 6x+";
  }

  const retentionCustomerPeriodMap = new Map<string, RetentionCustomerAccumulator>();
  const retentionCustomerMonthMap = new Map<string, RetentionCustomerAccumulator>();

  orders.forEach((order) => {
    const customer = cleanDashboardText(order.customerName || order.buyerUsername || order.recipientName || order.customerId);
    if (!customer) return;

    const key = channelKey(order);
    const channel = channelName(key);
    const month = toMonthKey(order.orderCreatedAt);
    const customerKey = customer.toLowerCase();
    const periodKey = `${key}|${customerKey}`;
    const monthlyKey = `${month}|${key}|${customerKey}`;

    const currentPeriod = retentionCustomerPeriodMap.get(periodKey) ?? {
      customer,
      channel,
      channelKey: key,
      orders: new Set<string>(),
      totalGMV: 0,
      firstOrder: null,
      lastOrder: null,
    };
    currentPeriod.orders.add(order.orderId);
    currentPeriod.totalGMV += orderBookedGMV(order);
    if (order.orderCreatedAt) {
      if (!currentPeriod.firstOrder || order.orderCreatedAt < currentPeriod.firstOrder) currentPeriod.firstOrder = order.orderCreatedAt;
      if (!currentPeriod.lastOrder || order.orderCreatedAt > currentPeriod.lastOrder) currentPeriod.lastOrder = order.orderCreatedAt;
    }
    retentionCustomerPeriodMap.set(periodKey, currentPeriod);

    const currentMonth = retentionCustomerMonthMap.get(monthlyKey) ?? {
      customer,
      channel,
      channelKey: key,
      month,
      orders: new Set<string>(),
      totalGMV: 0,
      firstOrder: null,
      lastOrder: null,
    };
    currentMonth.orders.add(order.orderId);
    currentMonth.totalGMV += orderBookedGMV(order);
    if (order.orderCreatedAt) {
      if (!currentMonth.firstOrder || order.orderCreatedAt < currentMonth.firstOrder) currentMonth.firstOrder = order.orderCreatedAt;
      if (!currentMonth.lastOrder || order.orderCreatedAt > currentMonth.lastOrder) currentMonth.lastOrder = order.orderCreatedAt;
    }
    retentionCustomerMonthMap.set(monthlyKey, currentMonth);
  });

  const customerChannelMonths = new Map<string, string[]>();
  Array.from(retentionCustomerMonthMap.values()).forEach((customer) => {
    const key = `${customer.channelKey}|${customer.customer.toLowerCase()}`;
    const months = customerChannelMonths.get(key) ?? [];
    if (customer.month && !months.includes(customer.month)) months.push(customer.month);
    customerChannelMonths.set(key, months.sort());
  });

  const retentionChannelMap = new Map<string, {
    channel: string;
    channelKey: string;
    uniqueCustomers: number;
    repeatCustomers: number;
    returningCustomers: number;
    totalOrders: number;
    totalGMV: number;
    buckets: RetentionBucketTotals;
  }>();

  Array.from(retentionCustomerPeriodMap.values()).forEach((customer) => {
    const current = retentionChannelMap.get(customer.channelKey) ?? {
      channel: customer.channel,
      channelKey: customer.channelKey,
      uniqueCustomers: 0,
      repeatCustomers: 0,
      returningCustomers: 0,
      totalOrders: 0,
      totalGMV: 0,
      buckets: emptyRetentionBuckets(),
    };
    const purchaseCount = customer.orders.size;
    current.uniqueCustomers += 1;
    current.totalOrders += purchaseCount;
    current.totalGMV += customer.totalGMV;
    if (purchaseCount > 1) current.repeatCustomers += 1;
    if ((customerChannelMonths.get(`${customer.channelKey}|${customer.customer.toLowerCase()}`)?.filter((month) => month !== "Unknown").length ?? 0) > 1) {
      current.returningCustomers += 1;
    }
    addRetentionBucket(current.buckets, purchaseCount);
    retentionChannelMap.set(customer.channelKey, current);
  });

  const retentionMonthlyMap = new Map<string, {
    month: string;
    monthLabel: string;
    channel: string;
    channelKey: string;
    uniqueCustomers: number;
    repeatCustomers: number;
    returningCustomers: number;
    totalOrders: number;
    totalGMV: number;
    buckets: RetentionBucketTotals;
  }>();

  Array.from(retentionCustomerMonthMap.values()).forEach((customer) => {
    const month = customer.month ?? "Unknown";
    const key = `${month}|${customer.channelKey}`;
    const current = retentionMonthlyMap.get(key) ?? {
      month,
      monthLabel: monthLabel(month),
      channel: customer.channel,
      channelKey: customer.channelKey,
      uniqueCustomers: 0,
      repeatCustomers: 0,
      returningCustomers: 0,
      totalOrders: 0,
      totalGMV: 0,
      buckets: emptyRetentionBuckets(),
    };
    const purchaseCount = customer.orders.size;
    const previousMonths = customerChannelMonths.get(`${customer.channelKey}|${customer.customer.toLowerCase()}`) ?? [];
    current.uniqueCustomers += 1;
    current.totalOrders += purchaseCount;
    current.totalGMV += customer.totalGMV;
    if (purchaseCount > 1) current.repeatCustomers += 1;
    if (month !== "Unknown" && previousMonths.some((previousMonth) => previousMonth !== "Unknown" && previousMonth < month)) {
      current.returningCustomers += 1;
    }
    addRetentionBucket(current.buckets, purchaseCount);
    retentionMonthlyMap.set(key, current);
  });

  const retentionChannels = Array.from(retentionChannelMap.values())
    .map((channel) => ({
      channel: channel.channel,
      channelKey: channel.channelKey,
      uniqueCustomers: channel.uniqueCustomers,
      oneTimeCustomers: channel.buckets.oneTimeCustomers,
      twoTimeCustomers: channel.buckets.twoTimeCustomers,
      threeToFiveCustomers: channel.buckets.threeToFiveCustomers,
      sixPlusCustomers: channel.buckets.sixPlusCustomers,
      repeatCustomers: channel.repeatCustomers,
      returningCustomers: channel.returningCustomers,
      repeatRate: channel.uniqueCustomers ? (channel.repeatCustomers / channel.uniqueCustomers) * 100 : 0,
      returningRate: channel.uniqueCustomers ? (channel.returningCustomers / channel.uniqueCustomers) * 100 : 0,
      avgPurchaseFrequency: channel.uniqueCustomers ? channel.totalOrders / channel.uniqueCustomers : 0,
      totalOrders: channel.totalOrders,
      totalGMV: channel.totalGMV,
    }))
    .sort((a, b) => b.uniqueCustomers - a.uniqueCustomers || b.repeatRate - a.repeatRate);

  const retentionMonthly = Array.from(retentionMonthlyMap.values())
    .map((month) => ({
      month: month.month,
      monthLabel: month.monthLabel,
      channel: month.channel,
      channelKey: month.channelKey,
      uniqueCustomers: month.uniqueCustomers,
      oneTimeCustomers: month.buckets.oneTimeCustomers,
      twoTimeCustomers: month.buckets.twoTimeCustomers,
      threeToFiveCustomers: month.buckets.threeToFiveCustomers,
      sixPlusCustomers: month.buckets.sixPlusCustomers,
      repeatCustomers: month.repeatCustomers,
      returningCustomers: month.returningCustomers,
      repeatRate: month.uniqueCustomers ? (month.repeatCustomers / month.uniqueCustomers) * 100 : 0,
      returningRate: month.uniqueCustomers ? (month.returningCustomers / month.uniqueCustomers) * 100 : 0,
      avgPurchaseFrequency: month.uniqueCustomers ? month.totalOrders / month.uniqueCustomers : 0,
      totalOrders: month.totalOrders,
      totalGMV: month.totalGMV,
    }))
    .sort((a, b) => a.month.localeCompare(b.month) || a.channel.localeCompare(b.channel));

  const retentionTotals = Array.from(retentionCustomerPeriodMap.values()).reduce(
    (acc, customer) => {
      const purchaseCount = customer.orders.size;
      acc.uniqueCustomers += 1;
      acc.totalOrders += purchaseCount;
      acc.totalGMV += customer.totalGMV;
      if (purchaseCount > 1) acc.repeatCustomers += 1;
      if ((customerChannelMonths.get(`${customer.channelKey}|${customer.customer.toLowerCase()}`)?.filter((month) => month !== "Unknown").length ?? 0) > 1) {
        acc.returningCustomers += 1;
      }
      addRetentionBucket(acc.buckets, purchaseCount);
      return acc;
    },
    {
      uniqueCustomers: 0,
      repeatCustomers: 0,
      returningCustomers: 0,
      totalOrders: 0,
      totalGMV: 0,
      buckets: emptyRetentionBuckets(),
    },
  );

  const customerRetentionAnalytics = {
    summary: {
      uniqueCustomers: retentionTotals.uniqueCustomers,
      oneTimeCustomers: retentionTotals.buckets.oneTimeCustomers,
      twoTimeCustomers: retentionTotals.buckets.twoTimeCustomers,
      threeToFiveCustomers: retentionTotals.buckets.threeToFiveCustomers,
      sixPlusCustomers: retentionTotals.buckets.sixPlusCustomers,
      repeatCustomers: retentionTotals.repeatCustomers,
      returningCustomers: retentionTotals.returningCustomers,
      repeatRate: retentionTotals.uniqueCustomers ? (retentionTotals.repeatCustomers / retentionTotals.uniqueCustomers) * 100 : 0,
      returningRate: retentionTotals.uniqueCustomers ? (retentionTotals.returningCustomers / retentionTotals.uniqueCustomers) * 100 : 0,
      avgPurchaseFrequency: retentionTotals.uniqueCustomers ? retentionTotals.totalOrders / retentionTotals.uniqueCustomers : 0,
      totalOrders: retentionTotals.totalOrders,
      totalGMV: retentionTotals.totalGMV,
    },
    channels: retentionChannels,
    monthly: retentionMonthly,
    customers: Array.from(retentionCustomerPeriodMap.values())
      .map((customer) => {
        const purchaseCount = customer.orders.size;
        const activeMonths = customerChannelMonths.get(`${customer.channelKey}|${customer.customer.toLowerCase()}`)?.filter((month) => month !== "Unknown").length ?? 0;

        return {
          customer: customer.customer,
          channel: customer.channel,
          channelKey: customer.channelKey,
          purchaseCount,
          segment: retentionSegment(purchaseCount),
          activeMonths,
          totalGMV: customer.totalGMV,
          firstOrder: customer.firstOrder?.toISOString() ?? null,
          lastOrder: customer.lastOrder?.toISOString() ?? null,
        };
      })
      .sort((a, b) => b.purchaseCount - a.purchaseCount || b.totalGMV - a.totalGMV)
      .slice(0, 500),
  };

  const optionRows = rows.filter((row) => !row.itemId || !isExcludedGiveawaySku(row));

  const filterOptions = {
    channels: [
      { key: "gt", name: "GT" },
      { key: "mt", name: "MT" },
      { key: "shopee", name: "Shopee" },
      { key: "tiktok1", name: "TikTok Shop (Kayou ID)" },
      { key: "tiktok2", name: "TikTok Shop (Kayou Card ID)" },
    ],
    statuses: Array.from(new Set(optionRows.map((row) => row.normalizedStatus))).filter(Boolean).sort(),
    regionalManagers: Array.from(new Set(optionRows.map((row) => row.regionalManager).filter(Boolean))).sort(),
    areaManagers: Array.from(new Set(optionRows.map((row) => row.areaManager).filter(Boolean))).sort(),
    provinces: Array.from(new Set(optionRows.map((row) => row.province).filter(Boolean))).sort(),
    cities: Array.from(new Set(optionRows.map((row) => row.city).filter(Boolean))).sort(),
    skuTypes: Array.from(new Set(optionRows.map((row) => row.skuType).filter(Boolean))).sort(),
  };

  return {
    filters,
    summary,
    channels: channelsData,
    dailyGMV,
    managers: {
      regional: aggregateManagers("regional"),
      area: aggregateManagers("area"),
    },
    skus,
    locations: locationsData,
    statuses,
    orders: recentOrders,
    geoTransactions,
    customerRetention,
    customerRetentionAnalytics,
    uploads,
    batches,
    dataQuality,
    hasData: rawCount[0]?.count > 0,
    generatedAt: new Date().toISOString(),
    filterOptions,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
