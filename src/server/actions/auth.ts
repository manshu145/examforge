"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * Server actions for email/password auth + sign-out.
 *
 * Each action returns a tagged union (`{ ok }` | `{ error }`) instead of
 * throwing, so the calling client can render a toast without a try/catch.
 * `redirect()` is only used inside `signOut()` because that's a one-way action.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Tell us your name"),
});

// ──────────────────────────────────────────────────────────────────────────
// Login
// ──────────────────────────────────────────────────────────────────────────

export async function loginAction(
  input: z.infer<typeof loginSchema>,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Map common Supabase errors to friendlier copy.
    if (error.message.toLowerCase().includes("invalid login")) {
      return { ok: false, error: "Email or password is incorrect" };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Signup
// ──────────────────────────────────────────────────────────────────────────

export async function signupAction(
  input: z.infer<typeof signupSchema>,
): Promise<ActionResult & { needsEmailConfirmation?: boolean }> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("registered")) {
      return { ok: false, error: "An account with this email already exists" };
    }
    return { ok: false, error: error.message };
  }

  // If email confirmation is enabled in Supabase, `session` will be null and
  // the user must click the confirmation link. We surface that to the UI so
  // it can show a "check your email" state instead of redirecting.
  const needsEmailConfirmation = !data.session;
  return { ok: true, needsEmailConfirmation };
}

// ──────────────────────────────────────────────────────────────────────────
// Sign out
// ──────────────────────────────────────────────────────────────────────────

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
