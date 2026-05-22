/**
 * Free-tier quota enforcement.
 *
 * Truth lives in the `usage_events` table (append-only, indexed by
 * (user_id, feature, created_at)). We trust the user's `subscriptions.plan`
 * to short-circuit the count for paid users.
 *
 * The lookup is cheap (single COUNT(*) over an indexed range) and isolated
 * here so feature code reads as:
 *
 *   const quota = await assertQuota(userId, "plan");
 *   if (!quota.ok) return { ok: false, error: quota.reason };
 *   ... do the work ...
 *   await logUsage(userId, "plan", { tokens: ... });
 */

import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { subscriptions, usageEvents } from "@/lib/db/schema";

export type QuotaFeature = "doubt" | "evaluation" | "mock" | "plan";
export type QuotaWindow = "day" | "month";

/**
 * Free-tier limits per feature. Tune here.
 * Pro = unlimited (limit = Infinity).
 */
export const FREE_LIMITS: Record<
  QuotaFeature,
  { count: number; window: QuotaWindow; label: string }
> = {
  doubt: { count: 5, window: "day", label: "doubt-solver queries" },
  evaluation: { count: 3, window: "month", label: "answer evaluations" },
  mock: { count: 2, window: "month", label: "mock tests" },
  plan: { count: 2, window: "month", label: "study plan generations" },
};

function startOfWindow(window: QuotaWindow): Date {
  const now = new Date();
  if (window === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  // month
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type QuotaResult =
  | {
      ok: true;
      plan: "free" | "pro";
      used: number;
      limit: number;
      window: QuotaWindow;
    }
  | {
      ok: false;
      reason: string;
      plan: "free" | "pro";
      used: number;
      limit: number;
      window: QuotaWindow;
    };

/**
 * Check whether the user can perform `feature` right now.
 * Does NOT increment usage; call `logUsage` after the work succeeds.
 */
export async function assertQuota(
  userId: string,
  feature: QuotaFeature,
): Promise<QuotaResult> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  const plan = sub?.plan === "pro" ? "pro" : "free";
  const limits = FREE_LIMITS[feature];

  // Pro: unlimited.
  if (plan === "pro") {
    return {
      ok: true,
      plan,
      used: 0,
      limit: Number.POSITIVE_INFINITY,
      window: limits.window,
    };
  }

  const since = startOfWindow(limits.window);
  const [{ value: used }] = await db
    .select({ value: count() })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.feature, feature),
        gte(usageEvents.createdAt, since),
      ),
    );

  if (used >= limits.count) {
    return {
      ok: false,
      reason:
        `Free plan limit reached (${limits.count} ${limits.label}/${limits.window}). ` +
        `Upgrade to Pro for unlimited access.`,
      plan,
      used,
      limit: limits.count,
      window: limits.window,
    };
  }

  return {
    ok: true,
    plan,
    used,
    limit: limits.count,
    window: limits.window,
  };
}

/**
 * Append-only usage log. `metadata` is free-form -- we tend to put
 * { tokens_in, tokens_out, model, provider, latency_ms } here.
 */
export async function logUsage(
  userId: string,
  feature: QuotaFeature,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(usageEvents).values({
    userId,
    feature,
    metadata,
  });
}
