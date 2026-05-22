/**
 * Static plan metadata. Stripe price IDs come from env so we can keep
 * test/prod separate without a code change.
 */

export type PlanInterval = "monthly" | "yearly";

export const PRO_PRICES = {
  monthly: { amount: 499, currency: "INR" as const, interval: "monthly" as const },
  yearly: { amount: 3999, currency: "INR" as const, interval: "yearly" as const },
};

export function getPriceIdForInterval(interval: PlanInterval): string | undefined {
  return interval === "monthly"
    ? process.env.STRIPE_PRICE_ID_PRO_MONTHLY
    : process.env.STRIPE_PRICE_ID_PRO_YEARLY;
}
