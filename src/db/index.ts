import path from "node:path";
import fs from "node:fs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Database access.
 *
 * - Production: set DATABASE_URL (Neon, Supabase, RDS, any Postgres ≥ 14) → postgres.js driver.
 * - Local dev / CI / tests: leave DATABASE_URL unset → embedded Postgres (PGlite) stored under
 *   ./data/pglite (or in memory when PGLITE_MEMORY=1). Same SQL dialect, same migrations.
 *
 * Migrations in ./drizzle are applied automatically on first connection in PGlite mode.
 * In production run `npm run db:migrate` during deploy (see DEPLOY.md).
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

declare global {
  var __towncertDbPromise: Promise<Db> | undefined;
}

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function createPostgres(url: string): Promise<Db> {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const client = postgres(url, { max: Number(process.env.PG_POOL_MAX ?? 5), prepare: false, idle_timeout: 20 });
  return drizzle(client, { schema }) as unknown as Db;
}

async function createPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  let client: InstanceType<typeof PGlite>;
  if (process.env.PGLITE_MEMORY === "1") {
    client = new PGlite();
  } else {
    const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), "data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    client = new PGlite(dir);
  }
  await client.waitReady;
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__towncertDbPromise) {
    globalThis.__towncertDbPromise = process.env.DATABASE_URL ? createPostgres(process.env.DATABASE_URL) : createPglite();
  }
  return globalThis.__towncertDbPromise;
}

export { schema };
