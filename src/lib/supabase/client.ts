import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Browser-side Supabase client.
 *
 * Use inside Client Components ("use client") for interactive flows like
 * Google OAuth (`signInWithOAuth`) or live subscriptions. Server-side data
 * fetching should always go through `createClient()` from `./server.ts`.
 */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
