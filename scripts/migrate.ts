/** Apply ./drizzle migrations to DATABASE_URL (or the local PGlite db). Run during deploy. */
import { getDb } from "../src/db";

async function main() {
  if (process.env.DATABASE_URL) {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const db = (await getDb()) as unknown as Parameters<typeof migrate>[0];
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations applied to DATABASE_URL");
  } else {
    await getDb(); // PGlite path migrates on connect
    console.log("Local PGlite database migrated");
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
