import { and, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";

import { getLimit, ok, parseDate, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import {
  areaManagers,
  locations,
  normalizedOrders,
  orderItems,
  regionalManagers,
  salesHierarchy,
} from "@/server/db/schema";
import { requireApiSession, scopedDashboardSearchParams } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function channelPredicate(channel: string): SQL | null {
  if (channel === "gt") return eq(normalizedOrders.channelGroup, "GT");
  if (channel === "mt") return eq(normalizedOrders.channelGroup, "MT");
  if (channel === "shopee") return eq(normalizedOrders.sourceSystem, "shopee");
  if (channel === "tiktok1") {
    return and(
      eq(normalizedOrders.sourceSystem, "tiktok_shop"),
      sql`lower(${normalizedOrders.shopAccount}) not like '%card%'`,
    ) ?? null;
  }
  if (channel === "tiktok2") {
    return and(
      eq(normalizedOrders.sourceSystem, "tiktok_shop"),
      sql`lower(${normalizedOrders.shopAccount}) like '%card%'`,
    ) ?? null;
  }

  return null;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function existsItemLike(pattern: string) {
  return sql`exists (
    select 1
    from order_items oi
    where oi.order_id = ${normalizedOrders.id}
      and lower(coalesce(oi.source_sku_code, '') || ' ' || coalesce(oi.source_product_name, '') || ' ' || coalesce(oi.raw_item_snapshot, '')) like ${pattern} escape '\'
  )`;
}

function orderFilters(searchParams: URLSearchParams) {
  const filters: SQL[] = [];
  const batchId = searchParams.get("batchId");
  const channelGroup = searchParams.get("channelGroup");
  const sourceSystem = searchParams.get("sourceSystem");
  const shopAccount = searchParams.get("shopAccount");
  const sourceOrderId = searchParams.get("sourceOrderId");
  const normalizedStatus = searchParams.get("status");
  const city = searchParams.get("city");
  const province = searchParams.get("province");
  const channels = searchParams.get("channels")?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  const sku = searchParams.get("sku");
  const skuType = searchParams.get("skuType");
  const purchaseChannel = searchParams.get("purchaseChannel");
  const search = searchParams.get("search");
  const start = parseDate(searchParams.get("start"));
  const end = parseDate(searchParams.get("end"));

  if (batchId) filters.push(eq(normalizedOrders.batchId, batchId));
  if (channels.length) {
    const channelFilters = channels.map((channel) => channelPredicate(channel)).filter((condition): condition is SQL => Boolean(condition));
    const predicate = channelFilters.length ? or(...channelFilters) : null;
    if (predicate) filters.push(predicate);
  }
  if (channelGroup) filters.push(eq(normalizedOrders.channelGroup, channelGroup));
  if (sourceSystem) filters.push(eq(normalizedOrders.sourceSystem, sourceSystem));
  if (shopAccount) filters.push(eq(normalizedOrders.shopAccount, shopAccount));
  if (sourceOrderId) filters.push(eq(normalizedOrders.sourceOrderId, sourceOrderId));
  if (normalizedStatus && normalizedStatus !== "All" && normalizedStatus !== "all") filters.push(eq(normalizedOrders.normalizedStatus, normalizedStatus));
  if (searchParams.get("excludeCancelled") === "true") {
    filters.push(sql`${normalizedOrders.normalizedStatus} not in ('cancelled', 'returned', 'refunded')`);
  }
  if (city && city !== "All" && city !== "all") filters.push(eq(locations.cityStandard, city));
  if (province && province !== "All" && province !== "all") filters.push(eq(locations.provinceStandard, province));
  if (start) filters.push(gte(normalizedOrders.orderCreatedAt, start));
  if (end) filters.push(lte(normalizedOrders.orderCreatedAt, end));
  if (search) {
    const pattern = `%${escapeLike(search.toLowerCase())}%`;
    const predicate = or(
      sql`lower(coalesce(${normalizedOrders.sourceOrderId}, '')) like ${pattern} escape '\'`,
      sql`lower(coalesce(${normalizedOrders.shopAccount}, '')) like ${pattern} escape '\'`,
      existsItemLike(pattern),
    );
    if (predicate) filters.push(predicate);
  }
  if (sku) filters.push(existsItemLike(`%${escapeLike(sku.toLowerCase())}%`));
  if (skuType && skuType !== "All" && skuType !== "all") filters.push(sql`exists (
    select 1
    from order_items oi
    where oi.order_id = ${normalizedOrders.id}
      and oi.sku_type = ${skuType}
  )`);
  if (purchaseChannel) filters.push(existsItemLike(`%${escapeLike(purchaseChannel.toLowerCase())}%`));

  return filters.length ? and(...filters) : sql`1 = 1`;
}

export async function GET(request: Request) {
  try {
    const access = await requireApiSession();
    if (access instanceof Response) return access;

    const { searchParams: requestSearchParams } = new URL(request.url);
    const searchParams = scopedDashboardSearchParams(requestSearchParams, access.role);
    const limit = getLimit(searchParams, 100, 500);
    const includeItems = searchParams.get("includeItems") === "true";

    const orders = await db
      .select({
        id: normalizedOrders.id,
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
        province: locations.provinceStandard,
        city: locations.cityStandard,
        regionalManager: regionalManagers.managerName,
        areaManager: areaManagers.managerName,
      })
      .from(normalizedOrders)
      .leftJoin(locations, eq(normalizedOrders.locationId, locations.id))
      .leftJoin(salesHierarchy, eq(normalizedOrders.salesHierarchyId, salesHierarchy.id))
      .leftJoin(regionalManagers, eq(salesHierarchy.regionalManagerId, regionalManagers.id))
      .leftJoin(areaManagers, eq(salesHierarchy.areaManagerId, areaManagers.id))
      .where(orderFilters(searchParams))
      .orderBy(desc(normalizedOrders.orderCreatedAt), desc(normalizedOrders.createdAt))
      .limit(limit);

    if (!includeItems || !orders.length) {
      return ok({ orders });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orders.map((order) => order.id)));

    return ok({ orders, items });
  } catch (error) {
    return serverError(error);
  }
}
