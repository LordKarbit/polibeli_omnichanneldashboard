import { randomUUID } from "node:crypto";

import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createId = () => randomUUID();
const now = () => new Date();

const id = text("id").primaryKey().$defaultFn(createId);
const timestampTz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = timestampTz("created_at").notNull().$defaultFn(now);
const updatedAt = timestampTz("updated_at").notNull().$defaultFn(now);
const jsonColumn = <T>(name: string) => jsonb(name).$type<T>();

export const user = pgTable(
  "user",
  {
    id,
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role").notNull().default("viewer"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("user_role_idx").on(table.role),
  ],
);

export const rolePermissions = pgTable("role_permissions", {
  role: text("role").primaryKey(),
  permissions: jsonColumn<Record<string, boolean>>("permissions").notNull(),
  updatedAt,
});

export const session = pgTable(
  "session",
  {
    id,
    expiresAt: timestampTz("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt,
    updatedAt,
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id,
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestampTz("access_token_expires_at"),
    refreshTokenExpiresAt: timestampTz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id,
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestampTz("expires_at").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
  ],
);

export const uploadBatches = pgTable(
  "upload_batches",
  {
    id,
    uploadedByUserId: text("uploaded_by_user_id").references(() => user.id, { onDelete: "set null" }),
    uploadContext: text("upload_context").notNull().default("omnichannel_dashboard"),
    periodStart: timestampTz("period_start"),
    periodEnd: timestampTz("period_end"),
    processingStatus: text("processing_status").notNull().default("uploaded"),
    totalFiles: integer("total_files").notNull().default(0),
    totalRawRows: integer("total_raw_rows").notNull().default(0),
    totalNormalizedOrders: integer("total_normalized_orders").notNull().default(0),
    totalNormalizedItems: integer("total_normalized_items").notNull().default(0),
    validationSummary: jsonColumn<Record<string, unknown> | null>("validation_summary"),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("upload_batches_status_idx").on(table.processingStatus),
    index("upload_batches_period_idx").on(table.periodStart, table.periodEnd),
  ],
);

export const rawUploadedFiles = pgTable(
  "raw_uploaded_files",
  {
    id,
    batchId: text("batch_id")
      .notNull()
      .references(() => uploadBatches.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(),
    shopAccount: text("shop_account"),
    channelHint: text("channel_hint"),
    originalFileName: text("original_file_name").notNull(),
    storedFilePath: text("stored_file_path"),
    fileType: text("file_type"),
    fileHash: text("file_hash").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull().default(0),
    rowCount: integer("row_count").notNull().default(0),
    columnCount: integer("column_count").notNull().default(0),
    schemaDetected: jsonColumn<Record<string, unknown> | null>("schema_detected"),
    parsingStatus: text("parsing_status").notNull().default("pending"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("raw_uploaded_files_file_hash_idx").on(table.fileHash),
    index("raw_uploaded_files_batch_idx").on(table.batchId),
    index("raw_uploaded_files_source_idx").on(table.sourceSystem, table.shopAccount),
  ],
);

export const rawOrderLines = pgTable(
  "raw_order_lines",
  {
    id,
    uploadedFileId: text("uploaded_file_id")
      .notNull()
      .references(() => rawUploadedFiles.id, { onDelete: "cascade" }),
    batchId: text("batch_id")
      .notNull()
      .references(() => uploadBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    rawPayload: jsonColumn<Record<string, unknown>>("raw_payload").notNull(),
    rowHash: text("row_hash").notNull(),
    sourceOrderId: text("source_order_id"),
    sourceSkuCode: text("source_sku_code"),
    validationStatus: text("validation_status").notNull().default("pending"),
    validationErrors: jsonColumn<Record<string, unknown> | null>("validation_errors"),
    createdAt,
  },
  (table) => [
    uniqueIndex("raw_order_lines_file_row_idx").on(table.uploadedFileId, table.rowNumber),
    uniqueIndex("raw_order_lines_row_hash_idx").on(table.uploadedFileId, table.rowHash),
    index("raw_order_lines_batch_idx").on(table.batchId),
    index("raw_order_lines_source_order_idx").on(table.sourceOrderId),
  ],
);

export const channels = pgTable(
  "channels",
  {
    id,
    channelGroup: text("channel_group").notNull(),
    channelName: text("channel_name").notNull(),
    channelType: text("channel_type").notNull(),
    isMarketplace: boolean("is_marketplace").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("channels_group_name_idx").on(table.channelGroup, table.channelName),
  ],
);

export const platforms = pgTable(
  "platforms",
  {
    id,
    sourceSystem: text("source_system").notNull(),
    platformName: text("platform_name").notNull(),
    shopAccount: text("shop_account").notNull(),
    marketplaceCode: text("marketplace_code"),
    defaultChannelId: text("default_channel_id").references(() => channels.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("platforms_source_shop_idx").on(table.sourceSystem, table.shopAccount),
  ],
);

export const products = pgTable(
  "products",
  {
    id,
    canonicalSkuCode: text("canonical_sku_code").notNull(),
    barcode: text("barcode"),
    brandName: text("brand_name").notNull().default("Kayou"),
    productName: text("product_name").notNull(),
    skuName: text("sku_name"),
    categoryL1: text("category_l1"),
    categoryL2: text("category_l2"),
    categoryL3: text("category_l3"),
    categoryL4: text("category_l4"),
    skuType: text("sku_type").notNull().default("paid_product"),
    ipName: text("ip_name"),
    packSize: integer("pack_size"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("products_canonical_sku_idx").on(table.canonicalSkuCode),
    index("products_sku_type_idx").on(table.skuType),
    index("products_ip_idx").on(table.ipName),
  ],
);

export const productAliases = pgTable(
  "product_aliases",
  {
    id,
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(),
    sourceSkuCode: text("source_sku_code").notNull(),
    sourceProductName: text("source_product_name"),
    sourceVariationName: text("source_variation_name"),
    aliasConfidence: doublePrecision("alias_confidence").notNull().default(1),
    normalizationNotes: text("normalization_notes"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("product_alias_source_idx").on(
      table.sourceSystem,
      table.sourceSkuCode,
      table.sourceVariationName,
    ),
    index("product_alias_product_idx").on(table.productId),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id,
    customerIdentityHash: text("customer_identity_hash").notNull(),
    sourceCustomerId: text("source_customer_id"),
    customerName: text("customer_name"),
    buyerUsername: text("buyer_username"),
    recipientName: text("recipient_name"),
    customerType: text("customer_type").notNull().default("unknown"),
    primaryCategory: text("primary_category"),
    piiMask: text("pii_mask"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("customers_identity_hash_idx").on(table.customerIdentityHash),
    index("customers_type_idx").on(table.customerType),
  ],
);

export const locations = pgTable(
  "locations",
  {
    id,
    country: text("country").notNull().default("Indonesia"),
    provinceRaw: text("province_raw"),
    cityRaw: text("city_raw"),
    districtRaw: text("district_raw"),
    villageRaw: text("village_raw"),
    provinceStandard: text("province_standard"),
    cityStandard: text("city_standard"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("locations_standard_idx").on(table.provinceStandard, table.cityStandard),
    index("locations_raw_idx").on(table.provinceRaw, table.cityRaw),
  ],
);

export const orderStatuses = pgTable(
  "order_statuses",
  {
    id,
    sourceSystem: text("source_system").notNull(),
    rawStatus: text("raw_status").notNull(),
    rawSubstatus: text("raw_substatus"),
    normalizedStatus: text("normalized_status").notNull(),
    isCancelled: boolean("is_cancelled").notNull().default(false),
    isCompleted: boolean("is_completed").notNull().default(false),
    isActiveGmvEligible: boolean("is_active_gmv_eligible").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("order_statuses_source_raw_idx").on(table.sourceSystem, table.rawStatus, table.rawSubstatus),
    index("order_statuses_normalized_idx").on(table.normalizedStatus),
  ],
);

export const regionalManagers = pgTable(
  "regional_managers",
  {
    id,
    managerName: text("manager_name").notNull(),
    employeeCode: text("employee_code"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("regional_managers_name_idx").on(table.managerName),
  ],
);

export const areaManagers = pgTable(
  "area_managers",
  {
    id,
    regionalManagerId: text("regional_manager_id").references(() => regionalManagers.id, { onDelete: "set null" }),
    managerName: text("manager_name").notNull(),
    employeeCode: text("employee_code"),
    isAgency: boolean("is_agency").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("area_managers_region_name_idx").on(table.regionalManagerId, table.managerName),
    index("area_managers_agency_idx").on(table.isAgency),
  ],
);

export const salesHierarchy = pgTable(
  "sales_hierarchy",
  {
    id,
    regionalManagerId: text("regional_manager_id").references(() => regionalManagers.id, { onDelete: "set null" }),
    areaManagerId: text("area_manager_id").references(() => areaManagers.id, { onDelete: "set null" }),
    bdName: text("bd_name"),
    bdWorkcode: text("bd_workcode"),
    bdCity: text("bd_city"),
    bdProvince: text("bd_province"),
    hierarchyKey: text("hierarchy_key").notNull(),
    isAgency: boolean("is_agency").notNull().default(false),
    effectiveFrom: timestampTz("effective_from"),
    effectiveTo: timestampTz("effective_to"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("sales_hierarchy_key_idx").on(table.hierarchyKey),
    index("sales_hierarchy_region_area_idx").on(table.regionalManagerId, table.areaManagerId),
    index("sales_hierarchy_city_idx").on(table.bdProvince, table.bdCity),
  ],
);

export const normalizedOrders = pgTable(
  "normalized_orders",
  {
    id,
    orderKey: text("order_key").notNull(),
    sourceSystem: text("source_system").notNull(),
    shopAccount: text("shop_account").notNull(),
    sourceOrderId: text("source_order_id").notNull(),
    batchId: text("batch_id").references(() => uploadBatches.id, { onDelete: "set null" }),
    uploadedFileId: text("uploaded_file_id").references(() => rawUploadedFiles.id, { onDelete: "set null" }),
    channelId: text("channel_id").references(() => channels.id, { onDelete: "set null" }),
    platformId: text("platform_id").references(() => platforms.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
    statusId: text("status_id").references(() => orderStatuses.id, { onDelete: "set null" }),
    salesHierarchyId: text("sales_hierarchy_id").references(() => salesHierarchy.id, { onDelete: "set null" }),
    orderCreatedAt: timestampTz("order_created_at"),
    paidAt: timestampTz("paid_at"),
    shippedAt: timestampTz("shipped_at"),
    deliveredAt: timestampTz("delivered_at"),
    cancelledAt: timestampTz("cancelled_at"),
    normalizedStatus: text("normalized_status").notNull().default("pending"),
    channelGroup: text("channel_group").notNull(),
    bookedOrderGmv: doublePrecision("booked_order_gmv").notNull().default(0),
    activeOrderGmv: doublePrecision("active_order_gmv").notNull().default(0),
    orderPaidAmount: doublePrecision("order_paid_amount").notNull().default(0),
    orderPayableAmount: doublePrecision("order_payable_amount").notNull().default(0),
    orderDiscountAmount: doublePrecision("order_discount_amount").notNull().default(0),
    orderRefundAmount: doublePrecision("order_refund_amount").notNull().default(0),
    shippingFeeAmount: doublePrecision("shipping_fee_amount").notNull().default(0),
    paymentMethod: text("payment_method"),
    dedupeHash: text("dedupe_hash").notNull(),
    rawOrderSnapshot: jsonColumn<Record<string, unknown> | null>("raw_order_snapshot"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("normalized_orders_order_key_idx").on(table.orderKey),
    uniqueIndex("normalized_orders_dedupe_hash_idx").on(table.dedupeHash),
    index("normalized_orders_source_idx").on(table.sourceSystem, table.shopAccount),
    index("normalized_orders_batch_idx").on(table.batchId),
    index("normalized_orders_status_idx").on(table.normalizedStatus),
    index("normalized_orders_channel_date_idx").on(table.channelGroup, table.orderCreatedAt),
    index("normalized_orders_drilldown_idx").on(table.channelId, table.platformId, table.locationId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id,
    orderId: text("order_id")
      .notNull()
      .references(() => normalizedOrders.id, { onDelete: "cascade" }),
    rawLineId: text("raw_line_id").references(() => rawOrderLines.id, { onDelete: "set null" }),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    sourceLineNumber: integer("source_line_number"),
    sourceSkuCode: text("source_sku_code").notNull(),
    sourceProductName: text("source_product_name"),
    quantity: doublePrecision("quantity").notNull().default(0),
    returnedQuantity: doublePrecision("returned_quantity").notNull().default(0),
    unitOriginalPrice: doublePrecision("unit_original_price").notNull().default(0),
    unitDiscountedPrice: doublePrecision("unit_discounted_price").notNull().default(0),
    lineGrossAmount: doublePrecision("line_gross_amount").notNull().default(0),
    lineGmv: doublePrecision("line_gmv").notNull().default(0),
    lineDiscountAmount: doublePrecision("line_discount_amount").notNull().default(0),
    lineSellerDiscountAmount: doublePrecision("line_seller_discount_amount").notNull().default(0),
    linePlatformDiscountAmount: doublePrecision("line_platform_discount_amount").notNull().default(0),
    lineGrossProfitAmount: doublePrecision("line_gross_profit_amount").notNull().default(0),
    skuType: text("sku_type").notNull().default("paid_product"),
    isFreeItem: boolean("is_free_item").notNull().default(false),
    isBundleComponent: boolean("is_bundle_component").notNull().default(false),
    isPosm: boolean("is_posm").notNull().default(false),
    itemDedupeHash: text("item_dedupe_hash").notNull(),
    rawItemSnapshot: jsonColumn<Record<string, unknown> | null>("raw_item_snapshot"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("order_items_dedupe_hash_idx").on(table.itemDedupeHash),
    index("order_items_order_idx").on(table.orderId),
    index("order_items_product_idx").on(table.productId),
    index("order_items_source_sku_idx").on(table.sourceSkuCode),
    index("order_items_sku_type_idx").on(table.skuType),
  ],
);

export const marketplaceOrders = pgTable(
  "marketplace_orders",
  {
    id,
    orderId: text("order_id")
      .notNull()
      .references(() => normalizedOrders.id, { onDelete: "cascade" }),
    platformId: text("platform_id").references(() => platforms.id, { onDelete: "set null" }),
    marketplaceStatusRaw: text("marketplace_status_raw"),
    paymentStatusRaw: text("payment_status_raw"),
    fulfillmentStatusRaw: text("fulfillment_status_raw"),
    cancellationReason: text("cancellation_reason"),
    refundStatus: text("refund_status"),
    refundAmount: doublePrecision("refund_amount").notNull().default(0),
    skuGrossSalesAmount: doublePrecision("sku_gross_sales_amount").notNull().default(0),
    sellerDiscountAmount: doublePrecision("seller_discount_amount").notNull().default(0),
    platformDiscountAmount: doublePrecision("platform_discount_amount").notNull().default(0),
    voucherAmount: doublePrecision("voucher_amount").notNull().default(0),
    campaignName: text("campaign_name"),
    logisticsProvider: text("logistics_provider"),
    trackingNumber: text("tracking_number"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("marketplace_orders_order_idx").on(table.orderId),
    index("marketplace_orders_platform_idx").on(table.platformId),
    index("marketplace_orders_refund_idx").on(table.refundStatus),
  ],
);

export const metricsSnapshots = pgTable(
  "metrics_snapshots",
  {
    id,
    batchId: text("batch_id").references(() => uploadBatches.id, { onDelete: "set null" }),
    snapshotDate: timestampTz("snapshot_date").notNull(),
    grain: text("grain").notNull(),
    metricName: text("metric_name").notNull(),
    channelGroup: text("channel_group"),
    sourceSystem: text("source_system"),
    shopAccount: text("shop_account"),
    regionalManagerName: text("regional_manager_name"),
    areaManagerName: text("area_manager_name"),
    provinceStandard: text("province_standard"),
    cityStandard: text("city_standard"),
    skuCode: text("sku_code"),
    productName: text("product_name"),
    status: text("status"),
    bookedGmv: doublePrecision("booked_gmv").notNull().default(0),
    activeGmv: doublePrecision("active_gmv").notNull().default(0),
    orderCount: integer("order_count").notNull().default(0),
    activeOrderCount: integer("active_order_count").notNull().default(0),
    lineItemCount: integer("line_item_count").notNull().default(0),
    quantity: doublePrecision("quantity").notNull().default(0),
    customerCount: integer("customer_count").notNull().default(0),
    refundAmount: doublePrecision("refund_amount").notNull().default(0),
    discountAmount: doublePrecision("discount_amount").notNull().default(0),
    cancellationRate: doublePrecision("cancellation_rate").notNull().default(0),
    freebieRatio: doublePrecision("freebie_ratio").notNull().default(0),
    filterContext: jsonColumn<Record<string, unknown> | null>("filter_context"),
    createdAt,
  },
  (table) => [
    index("metrics_snapshots_batch_idx").on(table.batchId),
    index("metrics_snapshots_grain_date_idx").on(table.grain, table.snapshotDate),
    index("metrics_snapshots_channel_idx").on(table.channelGroup, table.shopAccount),
  ],
);

export const aiQueryLogs = pgTable(
  "ai_query_logs",
  {
    id,
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    batchId: text("batch_id").references(() => uploadBatches.id, { onDelete: "set null" }),
    question: text("question").notNull(),
    generatedSql: text("generated_sql"),
    safeSqlHash: text("safe_sql_hash"),
    filterContext: jsonColumn<Record<string, unknown> | null>("filter_context"),
    answerSummary: text("answer_summary"),
    chartSuggestion: jsonColumn<Record<string, unknown> | null>("chart_suggestion"),
    resultRowCount: integer("result_row_count").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    status: text("status").notNull().default("logged"),
    errorMessage: text("error_message"),
    createdAt,
  },
  (table) => [
    index("ai_query_logs_user_idx").on(table.userId),
    index("ai_query_logs_batch_idx").on(table.batchId),
    index("ai_query_logs_status_idx").on(table.status),
  ],
);

export const cleanedDatasetExports = pgTable(
  "cleaned_dataset_exports",
  {
    id,
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    batchId: text("batch_id").references(() => uploadBatches.id, { onDelete: "set null" }),
    exportType: text("export_type").notNull(),
    fileName: text("file_name").notNull(),
    filterContext: jsonColumn<Record<string, unknown> | null>("filter_context"),
    rowCount: integer("row_count").notNull().default(0),
    createdAt,
  },
  (table) => [
    index("cleaned_dataset_exports_batch_idx").on(table.batchId),
    index("cleaned_dataset_exports_user_idx").on(table.userId),
  ],
);

export const sourceFieldMappings = pgTable(
  "source_field_mappings",
  {
    id,
    sourceSystem: text("source_system").notNull(),
    shopAccount: text("shop_account"),
    sourceField: text("source_field").notNull(),
    normalizedField: text("normalized_field").notNull(),
    ruleDescription: text("rule_description"),
    isRequired: boolean("is_required").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("source_field_mappings_idx").on(table.sourceSystem, table.shopAccount, table.sourceField),
  ],
);

export const dedupeKeys = pgTable(
  "dedupe_keys",
  {
    scope: text("scope").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    batchId: text("batch_id").references(() => uploadBatches.id, { onDelete: "set null" }),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.dedupeKey] }),
    index("dedupe_keys_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const schema = {
  user,
  rolePermissions,
  session,
  account,
  verification,
  uploadBatches,
  rawUploadedFiles,
  rawOrderLines,
  channels,
  platforms,
  products,
  productAliases,
  customers,
  locations,
  orderStatuses,
  regionalManagers,
  areaManagers,
  salesHierarchy,
  normalizedOrders,
  orderItems,
  marketplaceOrders,
  metricsSnapshots,
  aiQueryLogs,
  cleanedDatasetExports,
  sourceFieldMappings,
  dedupeKeys,
};
