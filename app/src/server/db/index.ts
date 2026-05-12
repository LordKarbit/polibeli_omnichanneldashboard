import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { schema } from "./schema";

type AppDatabase = PostgresJsDatabase<typeof schema>;

const buildPhase = process.env.NEXT_PHASE === "phase-production-build";

function resolveDatabaseUrl() {
  const value =
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL;

  if (value) return value;

  if (process.env.NODE_ENV !== "production" || buildPhase) {
    return "pglite://memory";
  }

  throw new Error(
    "DATABASE_URL is required. Use the Supabase PostgreSQL connection string from Project Settings > Database.",
  );
}

function isPgliteUrl(databaseUrl: string) {
  return databaseUrl.startsWith("pglite:");
}

function pgliteDataDir(databaseUrl: string) {
  if (databaseUrl === "pglite://memory" || databaseUrl === "pglite:memory") return "memory://";
  if (databaseUrl.startsWith("pglite://")) return databaseUrl.slice("pglite://".length);
  if (databaseUrl.startsWith("pglite:")) return databaseUrl.slice("pglite:".length);
  return "memory://";
}

function isLocalPostgres(databaseUrl: string) {
  try {
    const { hostname } = new URL(databaseUrl);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function postgresSslMode(databaseUrl: string) {
  const explicit = process.env.POSTGRES_SSL ?? process.env.DATABASE_SSL;
  if (explicit === "false" || explicit === "disable") return false;
  if (explicit === "allow" || explicit === "prefer" || explicit === "require" || explicit === "verify-full") {
    return explicit;
  }
  return isLocalPostgres(databaseUrl) ? false : "require";
}

const databaseUrl = resolveDatabaseUrl();
const usePglite = isPgliteUrl(databaseUrl);

const globalForDb = globalThis as unknown as {
  omniPostgresClient?: Sql;
  omniPgliteClient?: PGlite;
  omniDb?: AppDatabase;
  omniDbUrl?: string;
};

function createDatabase() {
  if (usePglite) {
    const client = globalForDb.omniPgliteClient ?? new PGlite(pgliteDataDir(databaseUrl));
    const database = drizzlePglite(client, {
      schema,
      logger: process.env.DRIZZLE_LOG === "true",
    }) as unknown as AppDatabase;

    globalForDb.omniPgliteClient = client;
    return { database, postgresClient: undefined, pgliteClient: client };
  }

  const client =
    globalForDb.omniPostgresClient ??
    postgres(databaseUrl, {
      max: Number(process.env.POSTGRES_POOL_MAX ?? (process.env.NODE_ENV === "production" ? 10 : 3)),
      idle_timeout: Number(process.env.POSTGRES_IDLE_TIMEOUT ?? 20),
      connect_timeout: Number(process.env.POSTGRES_CONNECT_TIMEOUT ?? 20),
      prepare: process.env.POSTGRES_PREPARE === "true",
      ssl: postgresSslMode(databaseUrl),
      onnotice: process.env.DRIZZLE_LOG === "true" ? undefined : () => undefined,
    });

  const database = drizzlePostgres(client, {
    schema,
    logger: process.env.DRIZZLE_LOG === "true",
  });

  globalForDb.omniPostgresClient = client;
  return { database, postgresClient: client, pgliteClient: undefined };
}

const shouldReuseGlobal = process.env.NODE_ENV !== "production";
const existingDb = shouldReuseGlobal && globalForDb.omniDbUrl === databaseUrl ? globalForDb.omniDb : undefined;
const created = existingDb
  ? { database: existingDb, postgresClient: globalForDb.omniPostgresClient, pgliteClient: globalForDb.omniPgliteClient }
  : createDatabase();

export const db = created.database;
export const postgresClient = created.postgresClient;
export const pgliteClient = created.pgliteClient;
export const activeDatabaseUrl = databaseUrl;
export const isEphemeralDatabase = usePglite;

if (shouldReuseGlobal) {
  globalForDb.omniDb = db;
  globalForDb.omniDbUrl = databaseUrl;
}

export async function closeDatabaseConnection() {
  await postgresClient?.end({ timeout: 5 });
  await pgliteClient?.close();
}

export { schema };
