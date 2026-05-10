import { created, ok, serverError } from "@/server/api/http";
import { db } from "@/server/db";
import {
  areaManagers,
  channels,
  orderStatuses,
  platforms,
  regionalManagers,
  salesHierarchy,
  sourceFieldMappings,
} from "@/server/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const channelSeeds = [
  { channelGroup: "GT", channelName: "General Trade", channelType: "offline", isMarketplace: false },
  { channelGroup: "MT", channelName: "Modern Trade / Agency", channelType: "agency", isMarketplace: false },
  { channelGroup: "Marketplace", channelName: "Shopee", channelType: "marketplace", isMarketplace: true },
  { channelGroup: "Marketplace", channelName: "TikTok Shop", channelType: "marketplace", isMarketplace: true },
];

const platformSeeds = [
  { sourceSystem: "b2b_raw_dashboard", platformName: "B2B", shopAccount: "B2B GT/MT" },
  { sourceSystem: "shopee", platformName: "Shopee", shopAccount: "Shopee" },
  { sourceSystem: "tiktok_shop", platformName: "TikTok Shop", shopAccount: "TikTok Shop (Kayou ID)" },
  { sourceSystem: "tiktok_shop", platformName: "TikTok Shop", shopAccount: "TikTok Shop (Kayou Card ID)" },
];

const statusSeeds = [
  ["b2b_raw_dashboard", "Received", "completed", false, true],
  ["b2b_raw_dashboard", "Cancelled", "cancelled", true, false],
  ["b2b_raw_dashboard", "Pending Receipt", "pending", false, false],
  ["b2b_raw_dashboard", "Pending Shipment", "pending", false, false],
  ["shopee", "Selesai", "completed", false, true],
  ["shopee", "Batal", "cancelled", true, false],
  ["shopee", "Sedang Dikirim", "shipped", false, false],
  ["shopee", "Telah Dikirim", "shipped", false, false],
  ["tiktok_shop", "Completed", "completed", false, true],
  ["tiktok_shop", "Shipped", "shipped", false, false],
  ["tiktok_shop", "Canceled", "cancelled", true, false],
] as const;

const managerSeeds = {
  regional: ["Nur Setyo Aji", "Hakim Abdul Aziz"],
  area: [
    ["Riky Marojahan Hasibuan", "Hakim Abdul Aziz"],
    ["Wahyu Kusuma Nugroho", "Nur Setyo Aji"],
    ["Nur Setyo Aji", "Nur Setyo Aji"],
    ["Pungguh Ikhsan Priyombodo", "Nur Setyo Aji"],
    ["Lamsihar Sitorus", "Nur Setyo Aji"],
    ["Muliyawarman Muchtar", "Nur Setyo Aji"],
    ["Yoppi Dwi Ariesanto", "Hakim Abdul Aziz"],
    ["Agency", "Nur Setyo Aji"],
  ],
} as const;

const fieldMappingSeeds = [
  ["b2b_raw_dashboard", "Area Manager", "area_manager", "Area Manager = Agency maps B2B row to MT; otherwise GT", true],
  ["b2b_raw_dashboard", "SKUGMV sku gmv", "line_gmv", "B2B GMV source of truth from column AV", true],
  ["b2b_raw_dashboard", "sale order no", "source_order_id", "B2B source order id", true],
  ["shopee", "No. Pesanan", "source_order_id", "Shopee source order id", true],
  ["shopee", "Total Pembayaran", "booked_order_gmv", "Shopee order-level GMV must be deduped", true],
  ["shopee", "Harga Setelah Diskon", "unit_discounted_price", "Shopee item price after discount", true],
  ["tiktok_shop", "Order ID", "source_order_id", "TikTok source order id", true],
  ["tiktok_shop", "Order Amount", "booked_order_gmv", "TikTok order-level GMV must be deduped", true],
  ["tiktok_shop", "SKU Subtotal After Discount", "line_gmv", "TikTok SKU-level GMV", true],
] as const;

export async function GET() {
  try {
    const [channelRows, platformRows, statusRows] = await Promise.all([
      db.select().from(channels),
      db.select().from(platforms),
      db.select().from(orderStatuses),
    ]);

    return ok({ channels: channelRows, platforms: platformRows, statuses: statusRows });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST() {
  try {
    for (const channel of channelSeeds) {
      await db
        .insert(channels)
        .values(channel)
        .onConflictDoUpdate({
          target: [channels.channelGroup, channels.channelName],
          set: {
            channelType: channel.channelType,
            isMarketplace: channel.isMarketplace,
            updatedAt: new Date(),
          },
        });
    }

    for (const platform of platformSeeds) {
      await db
        .insert(platforms)
        .values(platform)
        .onConflictDoUpdate({
          target: [platforms.sourceSystem, platforms.shopAccount],
          set: {
            platformName: platform.platformName,
            updatedAt: new Date(),
          },
        });
    }

    for (const [sourceSystem, rawStatus, normalizedStatus, isCancelled, isCompleted] of statusSeeds) {
      await db
        .insert(orderStatuses)
        .values({
          sourceSystem,
          rawStatus,
          normalizedStatus,
          isCancelled,
          isCompleted,
          isActiveGmvEligible: !isCancelled,
        })
        .onConflictDoUpdate({
          target: [orderStatuses.sourceSystem, orderStatuses.rawStatus, orderStatuses.rawSubstatus],
          set: {
            normalizedStatus,
            isCancelled,
            isCompleted,
            isActiveGmvEligible: !isCancelled,
            updatedAt: new Date(),
          },
        });
    }

    for (const name of managerSeeds.regional) {
      await db
        .insert(regionalManagers)
        .values({ managerName: name })
        .onConflictDoUpdate({
          target: regionalManagers.managerName,
          set: { updatedAt: new Date() },
        });
    }

    const regionalRows = await db.select().from(regionalManagers);
    for (const [areaName, regionalName] of managerSeeds.area) {
      const regional = regionalRows.find((row) => row.managerName === regionalName);
      const [area] = await db
        .insert(areaManagers)
        .values({
          regionalManagerId: regional?.id,
          managerName: areaName,
          isAgency: areaName === "Agency",
        })
        .onConflictDoUpdate({
          target: [areaManagers.regionalManagerId, areaManagers.managerName],
          set: {
            isAgency: areaName === "Agency",
            updatedAt: new Date(),
          },
        })
        .returning();

      await db
        .insert(salesHierarchy)
        .values({
          regionalManagerId: regional?.id,
          areaManagerId: area.id,
          hierarchyKey: `${regionalName}|${areaName}`,
          isAgency: areaName === "Agency",
        })
        .onConflictDoUpdate({
          target: salesHierarchy.hierarchyKey,
          set: {
            regionalManagerId: regional?.id,
            areaManagerId: area.id,
            isAgency: areaName === "Agency",
            updatedAt: new Date(),
          },
        });
    }

    for (const [sourceSystem, sourceField, normalizedField, ruleDescription, isRequired] of fieldMappingSeeds) {
      await db
        .insert(sourceFieldMappings)
        .values({
          sourceSystem,
          sourceField,
          normalizedField,
          ruleDescription,
          isRequired,
        })
        .onConflictDoUpdate({
          target: [sourceFieldMappings.sourceSystem, sourceFieldMappings.shopAccount, sourceFieldMappings.sourceField],
          set: {
            normalizedField,
            ruleDescription,
            isRequired,
            updatedAt: new Date(),
          },
        });
    }

    const [channelRows, platformRows, statusRows] = await Promise.all([
      db.select().from(channels),
      db.select().from(platforms),
      db.select().from(orderStatuses),
    ]);

    return created({
      channels: channelRows.length,
      platforms: platformRows.length,
      statuses: statusRows.length,
    });
  } catch (error) {
    return serverError(error);
  }
}
