import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { env } from "@/lib/env";

/**
 * Stripe webhook. Source of truth for `subscriptions.plan` and `status`.
 *
 * Verifies the signature with STRIPE_WEBHOOK_SECRET, then handles:
 *   - checkout.session.completed: first subscription, links userId -> subscription
 *   - customer.subscription.updated|deleted: status / period changes, cancellations
 *
 * The handler is idempotent -- replays of the same event won't break invariants.
 */
export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { error: `bad signature: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || !session.subscription) break;
        const sub = (await getStripe().subscriptions.retrieve(
          session.subscription as string,
        )) as Stripe.Subscription;
        await upsertSubscription(userId, sub);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;
        await upsertSubscription(userId, sub);
        break;
      }
      default:
        // Ignore other events; Stripe sends many we don't care about.
        break;
    }
  } catch (err) {
    // Log and 500 so Stripe retries. We swallow downstream errors -- never
    // crash the route handler in a way that returns 200 with no work done.
    console.error("[stripe webhook] handler error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(userId: string, sub: Stripe.Subscription) {
  const isActive = sub.status === "active" || sub.status === "trialing";
  const plan = isActive ? "pro" : "free";

  // sub.current_period_end is a unix timestamp (seconds). Defensive about
  // edge cases where Stripe returns 0 / undefined.
  const periodEnd =
    typeof sub.current_period_end === "number" && sub.current_period_end > 0
      ? new Date(sub.current_period_end * 1000)
      : null;

  await db
    .update(subscriptions)
    .set({
      stripeCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}
