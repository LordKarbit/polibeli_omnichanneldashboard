import { afterAll } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";

process.env.DATABASE_URL = "pglite://memory";
process.env.BETTER_AUTH_SECRET = "test-only-omnichannel-dashboard";

const { closeDatabaseConnection, db } = await import("@/server/db");

await migrate(db as never, { migrationsFolder: "drizzle" });

afterAll(async () => {
  await closeDatabaseConnection();
});
