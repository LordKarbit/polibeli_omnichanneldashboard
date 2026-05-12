import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error(
    "DIRECT_DATABASE_URL or DATABASE_URL is required for Drizzle migrations. Use the Supabase direct PostgreSQL connection string.",
  );
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: process.env.POSTGRES_SSL === "false" || process.env.DATABASE_SSL === "false" ? false : "require",
  },
  casing: "snake_case",
  strict: true,
});
