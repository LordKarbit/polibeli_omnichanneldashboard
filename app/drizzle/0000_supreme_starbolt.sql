CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_query_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"batch_id" text,
	"question" text NOT NULL,
	"generated_sql" text,
	"safe_sql_hash" text,
	"filter_context" jsonb,
	"answer_summary" text,
	"chart_suggestion" jsonb,
	"result_row_count" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'logged' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "area_managers" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_manager_id" text,
	"manager_name" text NOT NULL,
	"employee_code" text,
	"is_agency" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_group" text NOT NULL,
	"channel_name" text NOT NULL,
	"channel_type" text NOT NULL,
	"is_marketplace" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleaned_dataset_exports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"batch_id" text,
	"export_type" text NOT NULL,
	"file_name" text NOT NULL,
	"filter_context" jsonb,
	"row_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_identity_hash" text NOT NULL,
	"source_customer_id" text,
	"customer_name" text,
	"buyer_username" text,
	"recipient_name" text,
	"customer_type" text DEFAULT 'unknown' NOT NULL,
	"primary_category" text,
	"pii_mask" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dedupe_keys" (
	"scope" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"batch_id" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "dedupe_keys_scope_dedupe_key_pk" PRIMARY KEY("scope","dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"country" text DEFAULT 'Indonesia' NOT NULL,
	"province_raw" text,
	"city_raw" text,
	"district_raw" text,
	"village_raw" text,
	"province_standard" text,
	"city_standard" text,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"platform_id" text,
	"marketplace_status_raw" text,
	"payment_status_raw" text,
	"fulfillment_status_raw" text,
	"cancellation_reason" text,
	"refund_status" text,
	"refund_amount" double precision DEFAULT 0 NOT NULL,
	"sku_gross_sales_amount" double precision DEFAULT 0 NOT NULL,
	"seller_discount_amount" double precision DEFAULT 0 NOT NULL,
	"platform_discount_amount" double precision DEFAULT 0 NOT NULL,
	"voucher_amount" double precision DEFAULT 0 NOT NULL,
	"campaign_name" text,
	"logistics_provider" text,
	"tracking_number" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text,
	"snapshot_date" timestamp with time zone NOT NULL,
	"grain" text NOT NULL,
	"metric_name" text NOT NULL,
	"channel_group" text,
	"source_system" text,
	"shop_account" text,
	"regional_manager_name" text,
	"area_manager_name" text,
	"province_standard" text,
	"city_standard" text,
	"sku_code" text,
	"product_name" text,
	"status" text,
	"booked_gmv" double precision DEFAULT 0 NOT NULL,
	"active_gmv" double precision DEFAULT 0 NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"active_order_count" integer DEFAULT 0 NOT NULL,
	"line_item_count" integer DEFAULT 0 NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"customer_count" integer DEFAULT 0 NOT NULL,
	"refund_amount" double precision DEFAULT 0 NOT NULL,
	"discount_amount" double precision DEFAULT 0 NOT NULL,
	"cancellation_rate" double precision DEFAULT 0 NOT NULL,
	"freebie_ratio" double precision DEFAULT 0 NOT NULL,
	"filter_context" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "normalized_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_key" text NOT NULL,
	"source_system" text NOT NULL,
	"shop_account" text NOT NULL,
	"source_order_id" text NOT NULL,
	"batch_id" text,
	"uploaded_file_id" text,
	"channel_id" text,
	"platform_id" text,
	"customer_id" text,
	"location_id" text,
	"status_id" text,
	"sales_hierarchy_id" text,
	"order_created_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"normalized_status" text DEFAULT 'pending' NOT NULL,
	"channel_group" text NOT NULL,
	"booked_order_gmv" double precision DEFAULT 0 NOT NULL,
	"active_order_gmv" double precision DEFAULT 0 NOT NULL,
	"order_paid_amount" double precision DEFAULT 0 NOT NULL,
	"order_payable_amount" double precision DEFAULT 0 NOT NULL,
	"order_discount_amount" double precision DEFAULT 0 NOT NULL,
	"order_refund_amount" double precision DEFAULT 0 NOT NULL,
	"shipping_fee_amount" double precision DEFAULT 0 NOT NULL,
	"payment_method" text,
	"dedupe_hash" text NOT NULL,
	"raw_order_snapshot" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"raw_line_id" text,
	"product_id" text,
	"source_line_number" integer,
	"source_sku_code" text NOT NULL,
	"source_product_name" text,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"returned_quantity" double precision DEFAULT 0 NOT NULL,
	"unit_original_price" double precision DEFAULT 0 NOT NULL,
	"unit_discounted_price" double precision DEFAULT 0 NOT NULL,
	"line_gross_amount" double precision DEFAULT 0 NOT NULL,
	"line_gmv" double precision DEFAULT 0 NOT NULL,
	"line_discount_amount" double precision DEFAULT 0 NOT NULL,
	"line_seller_discount_amount" double precision DEFAULT 0 NOT NULL,
	"line_platform_discount_amount" double precision DEFAULT 0 NOT NULL,
	"line_gross_profit_amount" double precision DEFAULT 0 NOT NULL,
	"sku_type" text DEFAULT 'paid_product' NOT NULL,
	"is_free_item" boolean DEFAULT false NOT NULL,
	"is_bundle_component" boolean DEFAULT false NOT NULL,
	"is_posm" boolean DEFAULT false NOT NULL,
	"item_dedupe_hash" text NOT NULL,
	"raw_item_snapshot" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"source_system" text NOT NULL,
	"raw_status" text NOT NULL,
	"raw_substatus" text,
	"normalized_status" text NOT NULL,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_active_gmv_eligible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" text PRIMARY KEY NOT NULL,
	"source_system" text NOT NULL,
	"platform_name" text NOT NULL,
	"shop_account" text NOT NULL,
	"marketplace_code" text,
	"default_channel_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"source_system" text NOT NULL,
	"source_sku_code" text NOT NULL,
	"source_product_name" text,
	"source_variation_name" text,
	"alias_confidence" double precision DEFAULT 1 NOT NULL,
	"normalization_notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"canonical_sku_code" text NOT NULL,
	"barcode" text,
	"brand_name" text DEFAULT 'Kayou' NOT NULL,
	"product_name" text NOT NULL,
	"sku_name" text,
	"category_l1" text,
	"category_l2" text,
	"category_l3" text,
	"category_l4" text,
	"sku_type" text DEFAULT 'paid_product' NOT NULL,
	"ip_name" text,
	"pack_size" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_order_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"uploaded_file_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"row_hash" text NOT NULL,
	"source_order_id" text,
	"source_sku_code" text,
	"validation_status" text DEFAULT 'pending' NOT NULL,
	"validation_errors" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_uploaded_files" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"source_system" text NOT NULL,
	"shop_account" text,
	"channel_hint" text,
	"original_file_name" text NOT NULL,
	"stored_file_path" text,
	"file_type" text,
	"file_hash" text NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"column_count" integer DEFAULT 0 NOT NULL,
	"schema_detected" jsonb,
	"parsing_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regional_managers" (
	"id" text PRIMARY KEY NOT NULL,
	"manager_name" text NOT NULL,
	"employee_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" text PRIMARY KEY NOT NULL,
	"permissions" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_hierarchy" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_manager_id" text,
	"area_manager_id" text,
	"bd_name" text,
	"bd_workcode" text,
	"bd_city" text,
	"bd_province" text,
	"hierarchy_key" text NOT NULL,
	"is_agency" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "source_field_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"source_system" text NOT NULL,
	"shop_account" text,
	"source_field" text NOT NULL,
	"normalized_field" text NOT NULL,
	"rule_description" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"uploaded_by_user_id" text,
	"upload_context" text DEFAULT 'omnichannel_dashboard' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"processing_status" text DEFAULT 'uploaded' NOT NULL,
	"total_files" integer DEFAULT 0 NOT NULL,
	"total_raw_rows" integer DEFAULT 0 NOT NULL,
	"total_normalized_orders" integer DEFAULT 0 NOT NULL,
	"total_normalized_items" integer DEFAULT 0 NOT NULL,
	"validation_summary" jsonb,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_query_logs" ADD CONSTRAINT "ai_query_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_query_logs" ADD CONSTRAINT "ai_query_logs_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_managers" ADD CONSTRAINT "area_managers_regional_manager_id_regional_managers_id_fk" FOREIGN KEY ("regional_manager_id") REFERENCES "public"."regional_managers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaned_dataset_exports" ADD CONSTRAINT "cleaned_dataset_exports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaned_dataset_exports" ADD CONSTRAINT "cleaned_dataset_exports_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dedupe_keys" ADD CONSTRAINT "dedupe_keys_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_order_id_normalized_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."normalized_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics_snapshots" ADD CONSTRAINT "metrics_snapshots_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_orders" ADD CONSTRAINT "normalized_orders_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_orders" ADD CONSTRAINT "normalized_orders_uploaded_file_id_raw_uploaded_files_id_fk" FOREIGN KEY ("uploaded_file_id") REFERENCES "public"."raw_uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_orders" ADD CONSTRAINT "normalized_orders_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_orders" ADD CONSTRAINT "normalized_orders_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_orders" ADD CONSTRAINT "normalized_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_orders" ADD CONSTRAINT "normalized_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_orders" ADD CONSTRAINT "normalized_orders_status_id_order_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."order_statuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_orders" ADD CONSTRAINT "normalized_orders_sales_hierarchy_id_sales_hierarchy_id_fk" FOREIGN KEY ("sales_hierarchy_id") REFERENCES "public"."sales_hierarchy"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_normalized_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."normalized_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_raw_line_id_raw_order_lines_id_fk" FOREIGN KEY ("raw_line_id") REFERENCES "public"."raw_order_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_default_channel_id_channels_id_fk" FOREIGN KEY ("default_channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_aliases" ADD CONSTRAINT "product_aliases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_order_lines" ADD CONSTRAINT "raw_order_lines_uploaded_file_id_raw_uploaded_files_id_fk" FOREIGN KEY ("uploaded_file_id") REFERENCES "public"."raw_uploaded_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_order_lines" ADD CONSTRAINT "raw_order_lines_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_uploaded_files" ADD CONSTRAINT "raw_uploaded_files_batch_id_upload_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."upload_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_hierarchy" ADD CONSTRAINT "sales_hierarchy_regional_manager_id_regional_managers_id_fk" FOREIGN KEY ("regional_manager_id") REFERENCES "public"."regional_managers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_hierarchy" ADD CONSTRAINT "sales_hierarchy_area_manager_id_area_managers_id_fk" FOREIGN KEY ("area_manager_id") REFERENCES "public"."area_managers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "ai_query_logs_user_idx" ON "ai_query_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_query_logs_batch_idx" ON "ai_query_logs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "ai_query_logs_status_idx" ON "ai_query_logs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "area_managers_region_name_idx" ON "area_managers" USING btree ("regional_manager_id","manager_name");--> statement-breakpoint
CREATE INDEX "area_managers_agency_idx" ON "area_managers" USING btree ("is_agency");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_group_name_idx" ON "channels" USING btree ("channel_group","channel_name");--> statement-breakpoint
CREATE INDEX "cleaned_dataset_exports_batch_idx" ON "cleaned_dataset_exports" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "cleaned_dataset_exports_user_idx" ON "cleaned_dataset_exports" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_identity_hash_idx" ON "customers" USING btree ("customer_identity_hash");--> statement-breakpoint
CREATE INDEX "customers_type_idx" ON "customers" USING btree ("customer_type");--> statement-breakpoint
CREATE INDEX "dedupe_keys_entity_idx" ON "dedupe_keys" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "locations_standard_idx" ON "locations" USING btree ("province_standard","city_standard");--> statement-breakpoint
CREATE INDEX "locations_raw_idx" ON "locations" USING btree ("province_raw","city_raw");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_orders_order_idx" ON "marketplace_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "marketplace_orders_platform_idx" ON "marketplace_orders" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "marketplace_orders_refund_idx" ON "marketplace_orders" USING btree ("refund_status");--> statement-breakpoint
CREATE INDEX "metrics_snapshots_batch_idx" ON "metrics_snapshots" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "metrics_snapshots_grain_date_idx" ON "metrics_snapshots" USING btree ("grain","snapshot_date");--> statement-breakpoint
CREATE INDEX "metrics_snapshots_channel_idx" ON "metrics_snapshots" USING btree ("channel_group","shop_account");--> statement-breakpoint
CREATE UNIQUE INDEX "normalized_orders_order_key_idx" ON "normalized_orders" USING btree ("order_key");--> statement-breakpoint
CREATE UNIQUE INDEX "normalized_orders_dedupe_hash_idx" ON "normalized_orders" USING btree ("dedupe_hash");--> statement-breakpoint
CREATE INDEX "normalized_orders_source_idx" ON "normalized_orders" USING btree ("source_system","shop_account");--> statement-breakpoint
CREATE INDEX "normalized_orders_batch_idx" ON "normalized_orders" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "normalized_orders_status_idx" ON "normalized_orders" USING btree ("normalized_status");--> statement-breakpoint
CREATE INDEX "normalized_orders_channel_date_idx" ON "normalized_orders" USING btree ("channel_group","order_created_at");--> statement-breakpoint
CREATE INDEX "normalized_orders_drilldown_idx" ON "normalized_orders" USING btree ("channel_id","platform_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_dedupe_hash_idx" ON "order_items" USING btree ("item_dedupe_hash");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_items_source_sku_idx" ON "order_items" USING btree ("source_sku_code");--> statement-breakpoint
CREATE INDEX "order_items_sku_type_idx" ON "order_items" USING btree ("sku_type");--> statement-breakpoint
CREATE UNIQUE INDEX "order_statuses_source_raw_idx" ON "order_statuses" USING btree ("source_system","raw_status","raw_substatus");--> statement-breakpoint
CREATE INDEX "order_statuses_normalized_idx" ON "order_statuses" USING btree ("normalized_status");--> statement-breakpoint
CREATE UNIQUE INDEX "platforms_source_shop_idx" ON "platforms" USING btree ("source_system","shop_account");--> statement-breakpoint
CREATE UNIQUE INDEX "product_alias_source_idx" ON "product_aliases" USING btree ("source_system","source_sku_code","source_variation_name");--> statement-breakpoint
CREATE INDEX "product_alias_product_idx" ON "product_aliases" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_canonical_sku_idx" ON "products" USING btree ("canonical_sku_code");--> statement-breakpoint
CREATE INDEX "products_sku_type_idx" ON "products" USING btree ("sku_type");--> statement-breakpoint
CREATE INDEX "products_ip_idx" ON "products" USING btree ("ip_name");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_order_lines_file_row_idx" ON "raw_order_lines" USING btree ("uploaded_file_id","row_number");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_order_lines_row_hash_idx" ON "raw_order_lines" USING btree ("uploaded_file_id","row_hash");--> statement-breakpoint
CREATE INDEX "raw_order_lines_batch_idx" ON "raw_order_lines" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "raw_order_lines_source_order_idx" ON "raw_order_lines" USING btree ("source_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_uploaded_files_file_hash_idx" ON "raw_uploaded_files" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "raw_uploaded_files_batch_idx" ON "raw_uploaded_files" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "raw_uploaded_files_source_idx" ON "raw_uploaded_files" USING btree ("source_system","shop_account");--> statement-breakpoint
CREATE UNIQUE INDEX "regional_managers_name_idx" ON "regional_managers" USING btree ("manager_name");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_hierarchy_key_idx" ON "sales_hierarchy" USING btree ("hierarchy_key");--> statement-breakpoint
CREATE INDEX "sales_hierarchy_region_area_idx" ON "sales_hierarchy" USING btree ("regional_manager_id","area_manager_id");--> statement-breakpoint
CREATE INDEX "sales_hierarchy_city_idx" ON "sales_hierarchy" USING btree ("bd_province","bd_city");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_field_mappings_idx" ON "source_field_mappings" USING btree ("source_system","shop_account","source_field");--> statement-breakpoint
CREATE INDEX "upload_batches_status_idx" ON "upload_batches" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "upload_batches_period_idx" ON "upload_batches" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");