import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Edge-friendly session refresher used by the root middleware.
 *
 * Responsibilities:
 *  1. Refresh the Supabase auth cookies on every request (so RSCs see a
 *     fresh user without the user clicking around).
 *  2. Enforce route protection:
 *     - Unauthenticated users on `/(app)/*` or `/onboarding` -> redirect to /login
 *     - Authenticated users on `/login` or `/signup` -> redirect to /dashboard
 *
 * The deeper "is the user onboarded?" gate lives in `(app)/layout.tsx` because
 * it requires a DB read which the middleware shouldn't do on every request.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/planner",
  "/mocks",
  "/evaluator",
  "/doubts",
  "/insights",
  "/progress",
  "/settings",
  "/onboarding",
];
const AUTH_PREFIXES = ["/login", "/signup", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() (not getSession()) -- it revalidates the JWT and
  // mutates cookies if the access token was refreshed. Without this call,
  // expired sessions are not refreshed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
