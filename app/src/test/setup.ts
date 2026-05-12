import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

import { createClient } from "@libsql/client";

const testDatabasePath = join(process.cwd(), "data", "test-omnichannel.sqlite");

process.env.DATABASE_URL = `file:${testDatabasePath}`;

async function applyMigrations() {
  await mkdir(dirname(testDatabasePath), { recursive: true });
  await rm(testDatabasePath, { force: true });

  const client = createClient({ url: process.env.DATABASE_URL! });
  const migrationSql = await readFile(join(process.cwd(), "drizzle", "0000_married_quicksilver.sql"), "utf8");
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.execute(statement);
  }

  client.close();
}

await applyMigrations();
