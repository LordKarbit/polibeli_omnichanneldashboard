import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { schema } from "./schema";

const defaultDatabaseUrl = "file:./data/omnichannel.sqlite";

function ensureSqliteDirectory(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    return;
  }

  const filePath = databaseUrl.slice("file:".length);
  if (filePath.startsWith("./data/") || filePath.startsWith("data/")) {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
  }
}

const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
ensureSqliteDirectory(databaseUrl);

const globalForDb = globalThis as unknown as {
  omniSqliteClient?: Client;
  omniDb?: LibSQLDatabase<typeof schema>;
};

export const sqliteClient =
  globalForDb.omniSqliteClient ??
  createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

export const db =
  globalForDb.omniDb ??
  drizzle(sqliteClient, {
    schema,
    logger: process.env.DRIZZLE_LOG === "true",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.omniSqliteClient = sqliteClient;
  globalForDb.omniDb = db;
}

export { schema };
