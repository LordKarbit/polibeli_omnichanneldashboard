import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import * as XLSX from "xlsx";

import { csvResponse } from "@/server/api/csv";
import { getLimit, getOptionalSession, ok, parseDate, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import {
  areaManagers,
  cleanedDatasetExports,
  locations,
  marketplaceOrders,
  normalizedOrders,
  orderItems,
  products,
  regionalManagers,
  salesHierarchy,
} from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function exportFilters(searchParams: URLSearchParams) {
  const filters: SQL[] = [];
  const batchId = searchParams.get("batchId");
  const channelGroup = searchParams.get("channelGroup");
  const sourceSystem = searchParams.get("sourceSystem");
  const shopAccount = searchParams.get("shopAccount");
  const status = searchParams.get("status");
  const regionalManager = searchParams.get("regionalManager");
  const areaManager = searchParams.get("areaManager");
  const province = searchParams.get("province");
  const city = searchParams.get("city");
  const skuType = searchParams.get("skuType");
  const excludeCancelled = searchParams.get("excludeCancelled") === "true" || searchParams.get("includeCancelled") === "false";
  const start = parseDate(searchParams.get("start"));
  const end = parseDate(searchParams.get("end"));

  if (batchId) filters.push(eq(normalizedOrders.batchId, batchId));
  if (channelGroup) filters.push(eq(normalizedOrders.channelGroup, channelGroup));
  if (sourceSystem) filters.push(eq(normalizedOrders.sourceSystem, sourceSystem));
  if (shopAccount) filters.push(eq(normalizedOrders.shopAccount, shopAccount));
  if (status) filters.push(eq(normalizedOrders.normalizedStatus, status));
  if (regionalManager) filters.push(eq(regionalManagers.managerName, regionalManager));
  if (areaManager) filters.push(eq(areaManagers.managerName, areaManager));
  if (province) filters.push(eq(locations.provinceStandard, province));
  if (city) filters.push(eq(locations.cityStandard, city));
  if (skuType) filters.push(eq(orderItems.skuType, skuType));
  if (excludeCancelled) filters.push(sql`${normalizedOrders.normalizedStatus} not in ('cancelled', 'returned', 'refunded')`);
  if (start) filters.push(gte(normalizedOrders.orderCreatedAt, start));
  if (end) filters.push(lte(normalizedOrders.orderCreatedAt, end));

  return filters.length ? and(...filters) : sql`1 = 1`;
}

function xlsxResponse(fileName: string, rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = getLimit(searchParams, 5000, 50000);
  const asJson = searchParams.get("format") === "json";
  const asXlsx = searchParams.get("format") === "xlsx";

  try {
    const rows = await db
      .select({
        orderKey: normalizedOrders.orderKey,
        sourceSystem: normalizedOrders.sourceSystem,
        shopAccount: normalizedOrders.shopAccount,
        sourceOrderId: normalizedOrders.sourceOrderId,
        channelGroup: normalizedOrders.channelGroup,
        normalizedStatus: normalizedOrders.normalizedStatus,
        orderCreatedAt: normalizedOrders.orderCreatedAt,
        bookedOrderGmv: normalizedOrders.bookedOrderGmv,
        activeOrderGmv: normalizedOrders.activeOrderGmv,
        orderRefundAmount: normalizedOrders.orderRefundAmount,
        marketplaceRefundAmount: marketplaceOrders.refundAmount,
        province: locations.provinceStandard,
        city: locations.cityStandard,
        regionalManager: regionalManagers.managerName,
        areaManager: areaManagers.managerName,
        sourceSkuCode: orderItems.sourceSkuCode,
        canonicalSkuCode: products.canonicalSkuCode,
        productName: products.productName,
        skuType: orderItems.skuType,
        quantity: orderItems.quantity,
        lineGmv: orderItems.lineGmv,
        isFreeItem: orderItems.isFreeItem,
        isBundleComponent: orderItems.isBundleComponent,
        isPosm: orderItems.isPosm,
      })
      .from(orderItems)
      .innerJoin(normalizedOrders, eq(orderItems.orderId, normalizedOrders.id))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(locations, eq(normalizedOrders.locationId, locations.id))
      .leftJoin(salesHierarchy, eq(normalizedOrders.salesHierarchyId, salesHierarchy.id))
      .leftJoin(regionalManagers, eq(salesHierarchy.regionalManagerId, regionalManagers.id))
      .leftJoin(areaManagers, eq(salesHierarchy.areaManagerId, areaManagers.id))
      .leftJoin(marketplaceOrders, eq(marketplaceOrders.orderId, normalizedOrders.id))
      .where(exportFilters(searchParams))
      .limit(limit);

    const session = await getOptionalSession();
    const extension = asXlsx ? "xlsx" : "csv";
    const fileName = `cleaned-omnichannel-${new Date().toISOString().slice(0, 10)}.${extension}`;

    await db.insert(cleanedDatasetExports).values({
      userId: session?.user?.id,
      batchId: searchParams.get("batchId"),
      exportType: asJson ? "json" : extension,
      fileName,
      filterContext: Object.fromEntries(searchParams.entries()),
      rowCount: rows.length,
    });

    if (asJson) {
      return ok({ rows });
    }

    if (asXlsx) {
      return xlsxResponse(fileName, rows);
    }

    return csvResponse(fileName, rows);
  } catch (error) {
    return serverError(error);
  }
}
