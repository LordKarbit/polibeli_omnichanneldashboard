import { and, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";

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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function orderFilters(searchParams: URLSearchParams) {
  const filters: SQL[] = [];
  const batchId = searchParams.get("batchId");
  const channelGroup = searchParams.get("channelGroup");
  const sourceSystem = searchParams.get("sourceSystem");
  const shopAccount = searchParams.get("shopAccount");
  const normalizedStatus = searchParams.get("status");
  const city = searchParams.get("city");
  const province = searchParams.get("province");
  const start = parseDate(searchParams.get("start"));
  const end = parseDate(searchParams.get("end"));

  if (batchId) filters.push(eq(normalizedOrders.batchId, batchId));
  if (channelGroup) filters.push(eq(normalizedOrders.channelGroup, channelGroup));
  if (sourceSystem) filters.push(eq(normalizedOrders.sourceSystem, sourceSystem));
  if (shopAccount) filters.push(eq(normalizedOrders.shopAccount, shopAccount));
  if (normalizedStatus) filters.push(eq(normalizedOrders.normalizedStatus, normalizedStatus));
  if (city) filters.push(eq(locations.cityStandard, city));
  if (province) filters.push(eq(locations.provinceStandard, province));
  if (start) filters.push(gte(normalizedOrders.orderCreatedAt, start));
  if (end) filters.push(lte(normalizedOrders.orderCreatedAt, end));

  return filters.length ? and(...filters) : sql`1 = 1`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = getLimit(searchParams, 100, 500);
  const includeItems = searchParams.get("includeItems") === "true";

  try {
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
