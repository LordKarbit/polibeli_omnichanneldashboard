import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@libsql/client";
import postgres from "postgres";

const sourceUrl = process.env.SQLITE_DATABASE_URL ?? "file:./data/omnichannel.sqlite";
const targetUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.POSTGRES_URL;

const shouldTruncate = process.argv.includes("--truncate");
const dryRun = process.argv.includes("--dry-run");
const batchSize = Math.max(1, Number(process.env.MIGRATION_BATCH_SIZE ?? 500) || 500);

const tables = [
  "user",
  "role_permissions",
  "session",
  "account",
  "verification",
  "upload_batches",
  "raw_uploaded_files",
  "raw_order_lines",
  "channels",
  "platforms",
  "products",
  "product_aliases",
  "customers",
  "locations",
  "order_statuses",
  "regional_managers",
  "area_managers",
  "sales_hierarchy",
  "normalized_orders",
  "order_items",
  "marketplace_orders",
  "metrics_snapshots",
  "ai_query_logs",
  "cleaned_dataset_exports",
  "source_field_mappings",
  "dedupe_keys",
];

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function sqliteFilePath(url) {
  if (!url.startsWith("file:")) return null;
  return resolve(process.cwd(), url.slice("file:".length));
}

function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "bigint") return new Date(Number(value));

  const text = String(value);
  if (/^\d+$/.test(text)) return new Date(Number(text));

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeJson(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return value;
  }
}

function normalizeBoolean(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  return ["1", "true", "t", "yes", "y"].includes(text);
}

function normalizeValue(value, column) {
  if (column.data_type === "timestamp with time zone" || column.data_type === "timestamp without time zone") {
    return normalizeTimestamp(value);
  }
  if (column.udt_name === "jsonb" || column.data_type === "jsonb") return normalizeJson(value);
  if (column.data_type === "boolean") return normalizeBoolean(value);
  return value === undefined ? null : value;
}

async function targetColumns(sql, table) {
  const rows = await sql`
    select column_name, data_type, udt_name
    from information_schema.columns
    where table_schema = 'public' and table_name = ${table}
    order by ordinal_position
  `;

  if (!rows.length) {
    throw new Error(`Target table "${table}" does not exist. Run npm run db:migrate before migrating data.`);
  }

  return rows;
}

async function sourceRows(sqlite, table) {
  try {
    const result = await sqlite.execute(`select * from ${quoteIdentifier(table)}`);
    return result.rows;
  } catch (error) {
    if (String(error?.message ?? error).includes("no such table")) return [];
    throw error;
  }
}

async function insertBatch(sql, table, columns, rows) {
  if (!rows.length) return 0;

  const columnNames = columns.map((column) => column.column_name);
  const quotedColumns = columnNames.map(quoteIdentifier).join(", ");
  const values = [];
  const tuples = rows.map((row) => {
    const placeholders = columnNames.map((columnName) => {
      values.push(normalizeValue(row[columnName], columns.find((column) => column.column_name === columnName)));
      return `$${values.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  await sql.unsafe(
    `insert into ${quoteIdentifier(table)} (${quotedColumns}) values ${tuples.join(", ")} on conflict do nothing`,
    values,
  );

  return rows.length;
}

async function migrateTable(sqlite, sql, table) {
  const source = await sourceRows(sqlite, table);
  const columns = await targetColumns(sql, table);
  const availableColumns = columns.filter((column) => Object.prototype.hasOwnProperty.call(source[0] ?? {}, column.column_name));

  if (!source.length) {
    console.log(`- ${table}: 0 rows`);
    return 0;
  }

  if (!availableColumns.length) {
    throw new Error(`No matching columns found while migrating "${table}". Check source SQLite schema and target PostgreSQL migration.`);
  }

  if (dryRun) {
    console.log(`- ${table}: ${source.length} rows ready`);
    return source.length;
  }

  let inserted = 0;
  for (let index = 0; index < source.length; index += batchSize) {
    inserted += await insertBatch(sql, table, availableColumns, source.slice(index, index + batchSize));
  }

  console.log(`- ${table}: ${inserted} rows copied`);
  return inserted;
}

async function main() {
  if (!targetUrl) {
    throw new Error("Set DIRECT_DATABASE_URL or DATABASE_URL to your Supabase PostgreSQL connection string.");
  }

  const sourceFile = sqliteFilePath(sourceUrl);
  if (sourceFile && !existsSync(sourceFile)) {
    throw new Error(`SQLite source file not found: ${sourceFile}`);
  }

  const sqlite = createClient({ url: sourceUrl });
  const sql = postgres(targetUrl, {
    max: 1,
    prepare: false,
    ssl: process.env.POSTGRES_SSL === "false" || process.env.DATABASE_SSL === "false" ? false : "require",
  });

  try {
    console.log(`SQLite source: ${sourceUrl}`);
    console.log(`Postgres target: ${new URL(targetUrl).host}`);

    if (shouldTruncate && !dryRun) {
      console.log("Truncating target dashboard tables...");
      await sql.unsafe(`truncate table ${tables.map(quoteIdentifier).join(", ")} restart identity cascade`);
    }

    let total = 0;
    for (const table of tables) {
      total += await migrateTable(sqlite, sql, table);
    }

    console.log(`Done. ${dryRun ? "Validated" : "Copied"} ${total} rows.`);
  } finally {
    sqlite.close();
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
