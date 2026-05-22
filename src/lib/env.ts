import { z } from "zod";

/**
 * Centralized, Zod-validated environment variables.
 *
 * Why this matters:
 *  - Fails fast at build/startup if anything is missing (no surprise null derefs).
 *  - Single source of truth: server code imports `env`, never `process.env`.
 *  - `client` schema is a *whitelist* of what's safe to ship to the browser.
 *
 * Add to:
 *  - `.env.local` for local dev (gitignored)
 *  - Vercel env vars for production
 *  - `.env.example` to document the contract for collaborators.
 */

const serverSchema = z.object({
  // Runtime
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Database (Drizzle uses the Supabase Postgres connection string)
  DATABASE_URL: z.string().url().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_ID_PRO_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_ID_PRO_YEARLY: z.string().min(1).optional(),

  // AI providers
  OPENAI_API_KEY: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),

  // App
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
});

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_APP_URL: true,
});

/**
 * On the server, expose all vars after validation.
 * On the client, only expose `NEXT_PUBLIC_*`.
 *
 * Note: `optional()` is used during scaffolding so the project boots without
 * billing/AI keys configured. Each feature module should re-assert presence
 * before using its keys (e.g. `requireEnv("STRIPE_SECRET_KEY")`).
 */
function loadEnv() {
  const isServer = typeof window === "undefined";
  const source = isServer ? process.env : (globalThis as Record<string, unknown>);
  const schema = isServer ? serverSchema : clientSchema;
  const parsed = schema.safeParse(source);

  if (!parsed.success) {
    // Surface a clean, actionable error.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${issues}\n\n` +
        `Make sure your .env.local matches .env.example.`,
    );
  }
  return parsed.data;
}

/**
 * Server-side env type. Imports use this even on the client because
 * NEXT_PUBLIC_* vars are inlined by Next at build time, so accessing
 * server-only keys from a client component is a build-time error
 * (Next will warn) rather than a runtime crash.
 */
export type Env = z.infer<typeof serverSchema>;

export const env = loadEnv() as Env;

/** Throw if a specific env var is missing. Use at feature entry points. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Missing required environment variable: ${String(key)}. ` +
        `Add it to .env.local (see .env.example).`,
    );
  }
  return value as NonNullable<Env[K]>;
}
