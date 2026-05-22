"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { getStripe, APP_URL } from "@/lib/stripe/client";
import { getPriceIdForInterval, type PlanInterval } from "@/lib/stripe/plans";

/**
 * Create a Stripe Checkout session and redirect there. Customer is created
 * lazily and stored on the subscriptions row so subsequent checkouts reuse.
 *
 * Webhook (api/stripe/webhook) is the source of truth for plan = 'pro'.
 */
export async function startCheckout(interval: PlanInterval) {
  const user = await requireUser();
  const priceId = getPriceIdForInterval(interval);
  if (!priceId) {
    throw new Error(
      `Stripe price id not configured for ${interval}. ` +
        `Set STRIPE_PRICE_ID_PRO_${interval.toUpperCase()} in .env.`,
    );
  }

  const stripe = getStripe();

  // Look up existing customer or create one.
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });

  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.fullName ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db
      .update(subscriptions)
      .set({ stripeCustomerId: customerId })
      .where(eq(subscriptions.userId, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { userId: user.id },
    // Forward userId onto the subscription so customer.subscription.* events
    // can identify the owner without re-querying our DB.
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${APP_URL}/settings/billing?success=true`,
    cancel_url: `${APP_URL}/pricing?canceled=true`,
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  redirect(session.url);
}

/**
 * Open the Stripe Customer Portal so the user can manage payment methods,
 * cancel, or change plan without us building a UI for any of that.
 */
export async function openCustomerPortal() {
  const user = await requireUser();
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });
  if (!sub?.stripeCustomerId) {
    throw new Error("No Stripe customer on file. Subscribe first.");
  }
  const portal = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${APP_URL}/settings/billing`,
  });
  redirect(portal.url);
}
