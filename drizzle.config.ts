import "dotenv/config";
import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * - `schemaFilter: ["public"]` keeps drizzle-kit out of Supabase's `auth` /
 *   `storage` schemas; we only manage tables we own.
 * - `out` is committed (migrations are part of the repo, like Rails / Prisma).
 * - DATABASE_URL is optional at config-load time so `db:generate` works in
 *   environments without a live DB; `db:push` / `db:migrate` will fail loudly
 *   if it's missing, which is correct.
 */
export default {
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder",
  },
  // Strict mode = fail on accidental data loss.
  strict: true,
  verbose: true,
} satisfies Config;
