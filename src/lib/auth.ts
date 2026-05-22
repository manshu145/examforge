import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, type Profile } from "@/lib/db/schema";

/**
 * Server-side auth helpers. Use in Server Components, Server Actions,
 * Route Handlers.
 *
 * Pattern:
 *   - `getCurrentUser()` -- nullable, for pages that adapt to auth state.
 *   - `requireUser()`    -- throws (via redirect) if not signed in.
 *   - `requireOnboardedUser()` -- like above + ensures onboarding is complete.
 *
 * All functions hit Supabase Auth's session and may also read `profiles`.
 * Cheap on a single connection pool; if you call them in a tight loop,
 * memoize at the call site.
 */

export type AuthUser = {
  id: string;
  email: string | null;
  fullName: string | null;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    fullName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Used by the (app) layout. Redirects to:
 *   - /login        if not signed in
 *   - /onboarding   if signed in but profile.onboardedAt is null
 */
export async function requireOnboardedUser(): Promise<{
  user: AuthUser;
  profile: Profile;
}> {
  const user = await requireUser();
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  if (!profile) {
    // The handle_new_user() trigger creates this row on auth.users insert.
    // If we get here, the trigger didn't run (e.g. local dev without RLS
    // applied). Insert a minimal profile so we don't loop.
    await db.insert(profiles).values({ id: user.id }).onConflictDoNothing();
    redirect("/onboarding");
  }

  if (!profile.onboardedAt) redirect("/onboarding");
  return { user, profile };
}
