/**
 * Drizzle client (lazy singleton).
 *
 * Why postgres-js (not pg): smaller, faster, and the Drizzle team's
 * recommended driver for serverless / edge-friendly Node deployments.
 *
 * Why a Proxy: Next.js evaluates page modules at build time to collect route
 * config. If we eagerly opened a postgres connection on import, the build
 * would fail in any environment without DATABASE_URL set. The Proxy defers
 * construction until the first property access (i.e. the first query), and
 * caches the underlying client/pool on globalThis so HMR doesn't leak sockets.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
type PgClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  __examforgePg?: PgClient;
  __examforgeDb?: DrizzleClient;
};

function buildClient(): { pg: PgClient; db: DrizzleClient } {
  const url = requireEnv("DATABASE_URL");
  const pg = postgres(url, {
    // Supabase pooler caps connections; keep this conservative.
    max: 10,
    idle_timeout: 30,
    prepare: true,
  });
  const db = drizzle(pg, { schema, logger: false });
  return { pg, db };
}

function getDb(): DrizzleClient {
  if (globalForDb.__examforgeDb) return globalForDb.__examforgeDb;
  const { pg, db } = buildClient();
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__examforgePg = pg;
    globalForDb.__examforgeDb = db;
  }
  return db;
}

/**
 * Use `db` exactly as you would the eager Drizzle client:
 *   await db.select().from(profiles).where(eq(profiles.id, userId));
 *
 * The Proxy materialises the underlying client on the first property access.
 */
export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop, receiver) {
    const target = getDb();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export type Database = DrizzleClient;
export { schema };
