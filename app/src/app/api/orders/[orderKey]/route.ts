import { eq } from "drizzle-orm";

import { notFound, ok, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { marketplaceOrders, normalizedOrders, orderItems } from "@/server/db/schema";
import { canAccessOrderForRole, requireApiSession } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ orderKey: string }> }) {
  const { orderKey } = await context.params;

  try {
    const access = await requireApiSession();
    if (access instanceof Response) return access;

    const [order] = await db
      .select()
      .from(normalizedOrders)
      .where(eq(normalizedOrders.orderKey, decodeURIComponent(orderKey)))
      .limit(1);

    if (!order) {
      return notFound("Order not found");
    }

    if (!canAccessOrderForRole(access.role, order)) {
      return notFound("Order not found");
    }

    const [items, marketplace] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
      db.select().from(marketplaceOrders).where(eq(marketplaceOrders.orderId, order.id)).limit(1),
    ]);

    return ok({ order, items, marketplace: marketplace[0] ?? null });
  } catch (error) {
    return serverError(error);
  }
}
