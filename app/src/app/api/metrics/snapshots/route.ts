import { and, desc, eq, sql, type SQL } from "drizzle-orm";

import { badRequest, created, getLimit, ok, parseDate, readJson, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import { metricsSnapshots } from "@/server/db/schema";
import { requireApiPermission } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MetricsSnapshotInput = {
  batchId?: string;
  snapshotDate?: string;
  grain: string;
  metricName: string;
  channelGroup?: string;
  sourceSystem?: string;
  shopAccount?: string;
  regionalManagerName?: string;
  areaManagerName?: string;
  provinceStandard?: string;
  cityStandard?: string;
  skuCode?: string;
  productName?: string;
  status?: string;
  bookedGmv?: number;
  activeGmv?: number;
  orderCount?: number;
  activeOrderCount?: number;
  lineItemCount?: number;
  quantity?: number;
  customerCount?: number;
  refundAmount?: number;
  discountAmount?: number;
  cancellationRate?: number;
  freebieRatio?: number;
  filterContext?: Record<string, unknown>;
};

function snapshotFilters(searchParams: URLSearchParams) {
  const filters: SQL[] = [];
  const batchId = searchParams.get("batchId");
  const grain = searchParams.get("grain");
  const channelGroup = searchParams.get("channelGroup");
  const metricName = searchParams.get("metricName");

  if (batchId) filters.push(eq(metricsSnapshots.batchId, batchId));
  if (grain) filters.push(eq(metricsSnapshots.grain, grain));
  if (channelGroup) filters.push(eq(metricsSnapshots.channelGroup, channelGroup));
  if (metricName) filters.push(eq(metricsSnapshots.metricName, metricName));

  return filters.length ? and(...filters) : sql`1 = 1`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = getLimit(searchParams, 250, 1000);

  try {
    const access = await requireApiPermission("viewDataQuality");
    if (access instanceof Response) return access;

    const snapshots = await db
      .select()
      .from(metricsSnapshots)
      .where(snapshotFilters(searchParams))
      .orderBy(desc(metricsSnapshots.snapshotDate), desc(metricsSnapshots.createdAt))
      .limit(limit);

    return ok({ snapshots });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireApiPermission("manageReference", request);
  if (access instanceof Response) return access;

  const body = await readJson<{ snapshots?: MetricsSnapshotInput[] }>(request);

  if (!body?.snapshots?.length) {
    return badRequest("snapshots[] is required");
  }

  const invalid = body.snapshots.find((snapshot) => !snapshot.grain || !snapshot.metricName);
  if (invalid) {
    return badRequest("Each snapshot requires grain and metricName", invalid);
  }

  try {
    const inserted = await db
      .insert(metricsSnapshots)
      .values(
        body.snapshots.map((snapshot) => ({
          ...snapshot,
          snapshotDate: parseDate(snapshot.snapshotDate) ?? new Date(),
          bookedGmv: snapshot.bookedGmv ?? 0,
          activeGmv: snapshot.activeGmv ?? 0,
          orderCount: snapshot.orderCount ?? 0,
          activeOrderCount: snapshot.activeOrderCount ?? 0,
          lineItemCount: snapshot.lineItemCount ?? 0,
          quantity: snapshot.quantity ?? 0,
          customerCount: snapshot.customerCount ?? 0,
          refundAmount: snapshot.refundAmount ?? 0,
          discountAmount: snapshot.discountAmount ?? 0,
          cancellationRate: snapshot.cancellationRate ?? 0,
          freebieRatio: snapshot.freebieRatio ?? 0,
          filterContext: snapshot.filterContext ?? null,
        })),
      )
      .returning();

    return created({ inserted: inserted.length });
  } catch (error) {
    return serverError(error);
  }
}
