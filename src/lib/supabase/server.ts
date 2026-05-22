import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Server-side Supabase client.
 *
 * Use in Server Components, Server Actions, and Route Handlers. Reads/writes
 * the session cookies via `next/headers` so the user identity is correct on
 * every render.
 *
 * Note: in Server Components Next will throw if you try to *write* cookies
 * (cookie writes only allowed during Server Actions / Route Handlers).
 * We swallow that error in `setAll` because session refresh is best-effort
 * here -- the middleware is the canonical refresh point.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies; middleware handles refresh.
          }
        },
      },
    },
  );
}
