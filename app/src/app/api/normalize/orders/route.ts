import { desc, eq, sql } from "drizzle-orm";

import { badRequest, created, getLimit, ok, parseDate, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { marketplaceOrders, normalizedOrders, orderItems, uploadBatches } from "@/server/db/schema";
import { itemDedupeHash, orderDedupeHash } from "@/server/ingestion/hash";
import { inferSkuType, isCancelledStatus, normalizeStatus } from "@/server/ingestion/normalize";
import { requireApiPermission } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NormalizedItemInput = {
  rawLineId?: string;
  productId?: string;
  sourceLineNumber?: number;
  sourceSkuCode: string;
  sourceProductName?: string;
  quantity?: number;
  returnedQuantity?: number;
  unitOriginalPrice?: number;
  unitDiscountedPrice?: number;
  lineGrossAmount?: number;
  lineGmv?: number;
  lineDiscountAmount?: number;
  lineSellerDiscountAmount?: number;
  linePlatformDiscountAmount?: number;
  lineGrossProfitAmount?: number;
  skuType?: string;
  isFreeItem?: boolean;
  isBundleComponent?: boolean;
  isPosm?: boolean;
  rawItemSnapshot?: Record<string, unknown>;
};

type NormalizedOrderInput = {
  batchId?: string;
  uploadedFileId?: string;
  orderKey?: string;
  sourceSystem: string;
  shopAccount: string;
  sourceOrderId: string;
  channelId?: string;
  platformId?: string;
  customerId?: string;
  locationId?: string;
  statusId?: string;
  salesHierarchyId?: string;
  channelGroup: string;
  orderStatusRaw?: string;
  normalizedStatus?: string;
  orderCreatedAt?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  bookedOrderGmv?: number;
  activeOrderGmv?: number;
  orderPaidAmount?: number;
  orderPayableAmount?: number;
  orderDiscountAmount?: number;
  orderRefundAmount?: number;
  shippingFeeAmount?: number;
  paymentMethod?: string;
  rawOrderSnapshot?: Record<string, unknown>;
  items?: NormalizedItemInput[];
  marketplace?: {
    marketplaceStatusRaw?: string;
    paymentStatusRaw?: string;
    fulfillmentStatusRaw?: string;
    cancellationReason?: string;
    refundStatus?: string;
    refundAmount?: number;
    skuGrossSalesAmount?: number;
    sellerDiscountAmount?: number;
    platformDiscountAmount?: number;
    voucherAmount?: number;
    campaignName?: string;
    logisticsProvider?: string;
    trackingNumber?: string;
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = getLimit(searchParams, 100, 500);

  try {
    const access = await requireApiPermission("viewUpload");
    if (access instanceof Response) return access;

    const orders = await db
      .select()
      .from(normalizedOrders)
      .orderBy(desc(normalizedOrders.createdAt))
      .limit(limit);

    return ok({ orders });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireApiPermission("uploadData", request);
  if (access instanceof Response) return access;

  const body = await readJson<{ orders?: NormalizedOrderInput[] }>(request);

  if (!body?.orders?.length) {
    return badRequest("orders[] is required");
  }

  const invalidOrder = body.orders.find((order) => !order.sourceSystem || !order.shopAccount || !order.sourceOrderId);
  if (invalidOrder) {
    return badRequest("Each order requires sourceSystem, shopAccount, and sourceOrderId", invalidOrder);
  }

  try {
    const result = await db.transaction(async (tx) => {
      let upsertedOrders = 0;
      let upsertedItems = 0;
      let upsertedMarketplaceOrders = 0;

      for (const order of body.orders ?? []) {
        const orderKey = order.orderKey ?? `${order.sourceSystem}|${order.shopAccount}|${order.sourceOrderId}`;
        const normalizedStatus = order.normalizedStatus ?? normalizeStatus(order.orderStatusRaw);
        const bookedOrderGmv = order.bookedOrderGmv ?? order.items?.reduce((total, item) => total + (item.lineGmv ?? 0), 0) ?? 0;
        const activeOrderGmv =
          order.activeOrderGmv ?? (isCancelledStatus(normalizedStatus) ? 0 : bookedOrderGmv);

        const [upsertedOrder] = await tx
          .insert(normalizedOrders)
          .values({
            orderKey,
            sourceSystem: order.sourceSystem,
            shopAccount: order.shopAccount,
            sourceOrderId: order.sourceOrderId,
            batchId: order.batchId,
            uploadedFileId: order.uploadedFileId,
            channelId: order.channelId,
            platformId: order.platformId,
            customerId: order.customerId,
            locationId: order.locationId,
            statusId: order.statusId,
            salesHierarchyId: order.salesHierarchyId,
            orderCreatedAt: parseDate(order.orderCreatedAt),
            paidAt: parseDate(order.paidAt),
            shippedAt: parseDate(order.shippedAt),
            deliveredAt: parseDate(order.deliveredAt),
            cancelledAt: parseDate(order.cancelledAt),
            normalizedStatus,
            channelGroup: order.channelGroup,
            bookedOrderGmv,
            activeOrderGmv,
            orderPaidAmount: order.orderPaidAmount ?? 0,
            orderPayableAmount: order.orderPayableAmount ?? 0,
            orderDiscountAmount: order.orderDiscountAmount ?? 0,
            orderRefundAmount: order.orderRefundAmount ?? 0,
            shippingFeeAmount: order.shippingFeeAmount ?? 0,
            paymentMethod: order.paymentMethod,
            dedupeHash: orderDedupeHash(order.sourceSystem, order.shopAccount, order.sourceOrderId),
            rawOrderSnapshot: order.rawOrderSnapshot ?? null,
          })
          .onConflictDoUpdate({
            target: normalizedOrders.orderKey,
            set: {
              normalizedStatus,
              bookedOrderGmv,
              activeOrderGmv,
              orderRefundAmount: order.orderRefundAmount ?? 0,
              updatedAt: new Date(),
            },
          })
          .returning();

        upsertedOrders += 1;

        if (order.items?.length) {
          const itemValues = order.items.map((item, index) => {
            const lineGmv = item.lineGmv ?? 0;
            const skuType = item.skuType ?? inferSkuType(item.sourceSkuCode, item.sourceProductName, lineGmv);

            return {
              orderId: upsertedOrder.id,
              rawLineId: item.rawLineId,
              productId: item.productId,
              sourceLineNumber: item.sourceLineNumber ?? index + 1,
              sourceSkuCode: item.sourceSkuCode,
              sourceProductName: item.sourceProductName,
              quantity: item.quantity ?? 0,
              returnedQuantity: item.returnedQuantity ?? 0,
              unitOriginalPrice: item.unitOriginalPrice ?? 0,
              unitDiscountedPrice: item.unitDiscountedPrice ?? 0,
              lineGrossAmount: item.lineGrossAmount ?? lineGmv,
              lineGmv,
              lineDiscountAmount: item.lineDiscountAmount ?? 0,
              lineSellerDiscountAmount: item.lineSellerDiscountAmount ?? 0,
              linePlatformDiscountAmount: item.linePlatformDiscountAmount ?? 0,
              lineGrossProfitAmount: item.lineGrossProfitAmount ?? 0,
              skuType,
              isFreeItem: item.isFreeItem ?? (lineGmv === 0 || skuType === "free_gift"),
              isBundleComponent: item.isBundleComponent ?? (skuType === "bundle"),
              isPosm: item.isPosm ?? (skuType === "posm"),
              itemDedupeHash: itemDedupeHash(orderKey, item.sourceSkuCode, item.sourceLineNumber ?? index + 1),
              rawItemSnapshot: item.rawItemSnapshot ?? null,
            };
          });

          const items = await tx
            .insert(orderItems)
            .values(itemValues)
            .onConflictDoUpdate({
              target: orderItems.itemDedupeHash,
              set: {
                lineGmv: sql`excluded.line_gmv`,
                quantity: sql`excluded.quantity`,
                skuType: sql`excluded.sku_type`,
                updatedAt: new Date(),
              },
            })
            .returning();

          upsertedItems += items.length;
        }

        if (order.marketplace) {
          await tx
            .insert(marketplaceOrders)
            .values({
              orderId: upsertedOrder.id,
              platformId: order.platformId,
              marketplaceStatusRaw: order.marketplace.marketplaceStatusRaw,
              paymentStatusRaw: order.marketplace.paymentStatusRaw,
              fulfillmentStatusRaw: order.marketplace.fulfillmentStatusRaw,
              cancellationReason: order.marketplace.cancellationReason,
              refundStatus: order.marketplace.refundStatus,
              refundAmount: order.marketplace.refundAmount ?? 0,
              skuGrossSalesAmount: order.marketplace.skuGrossSalesAmount ?? 0,
              sellerDiscountAmount: order.marketplace.sellerDiscountAmount ?? 0,
              platformDiscountAmount: order.marketplace.platformDiscountAmount ?? 0,
              voucherAmount: order.marketplace.voucherAmount ?? 0,
              campaignName: order.marketplace.campaignName,
              logisticsProvider: order.marketplace.logisticsProvider,
              trackingNumber: order.marketplace.trackingNumber,
            })
            .onConflictDoUpdate({
              target: marketplaceOrders.orderId,
              set: {
                refundAmount: order.marketplace.refundAmount ?? 0,
                refundStatus: order.marketplace.refundStatus,
                updatedAt: new Date(),
              },
            });

          upsertedMarketplaceOrders += 1;
        }
      }

      const batchId = body.orders?.find((order) => order.batchId)?.batchId;
      if (batchId) {
        await tx
          .update(uploadBatches)
          .set({
            totalNormalizedOrders: sql`${uploadBatches.totalNormalizedOrders} + ${upsertedOrders}`,
            totalNormalizedItems: sql`${uploadBatches.totalNormalizedItems} + ${upsertedItems}`,
            processingStatus: "normalized",
            updatedAt: new Date(),
          })
          .where(eq(uploadBatches.id, batchId));
      }

      return {
        upsertedOrders,
        upsertedItems,
        upsertedMarketplaceOrders,
      };
    });

    return created(result);
  } catch (error) {
    return serverError(error);
  }
}
