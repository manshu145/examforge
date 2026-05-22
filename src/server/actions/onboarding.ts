"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

/**
 * `completeOnboarding` writes the user's exam, target year, daily hours, and
 * weak topics to `profiles`, then stamps `onboardedAt` so the (app) gate stops
 * redirecting them here.
 *
 * Returns a tagged union -- the wizard toasts on error and routes on success.
 */

const onboardingSchema = z.object({
  examId: z.enum(["upsc", "neet", "jee", "state_psc"], {
    errorMap: () => ({ message: "Pick an exam to continue" }),
  }),
  targetYear: z
    .number()
    .int()
    .min(new Date().getFullYear(), "Target year must be this year or later")
    .max(new Date().getFullYear() + 6, "Pick a target year within 6 years"),
  dailyHours: z
    .number()
    .int()
    .min(1, "At least 1 hour per day")
    .max(14, "More than 14 hours/day is unrealistic"),
  weakTopicIds: z
    .array(z.string())
    .max(20, "Pick at most 20 weak topics — quality over quantity"),
  fullName: z.string().min(1).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingResult = { ok: true } | { ok: false; error: string };

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<OnboardingResult> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { examId, targetYear, dailyHours, weakTopicIds, fullName } = parsed.data;

  await db
    .insert(profiles)
    .values({
      id: user.id,
      fullName: fullName ?? user.fullName ?? null,
      examId,
      targetYear,
      dailyHours,
      weakTopicIds,
      onboardedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        fullName: fullName ?? user.fullName ?? null,
        examId,
        targetYear,
        dailyHours,
        weakTopicIds,
        onboardedAt: new Date(),
      },
    });

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Used by the wizard server component to redirect already-onboarded users.
 * Saves a re-read of `profiles` from inside the wizard.
 */
export async function redirectIfOnboarded() {
  const user = await requireUser();
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });
  if (profile?.onboardedAt) redirect("/dashboard");
}
