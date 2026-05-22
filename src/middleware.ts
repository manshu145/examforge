import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Edge middleware: refreshes the Supabase session on every request and
 * enforces route protection. Real logic lives in `lib/supabase/middleware.ts`
 * so we can unit-test / share it if needed.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Skip Next internals and common static assets to keep the edge cheap.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
