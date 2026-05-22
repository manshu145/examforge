import Stripe from "stripe";

import { env, requireEnv } from "@/lib/env";

let _stripe: Stripe | null = null;

/** Lazy Stripe singleton. Throws if STRIPE_SECRET_KEY is missing at call time. */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = requireEnv("STRIPE_SECRET_KEY");
  _stripe = new Stripe(key, {
    // Pinned at the Stripe TS SDK's required version. Bump alongside `stripe` upgrades.
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    appInfo: { name: "ExamForge", version: "0.1.0" },
  });
  return _stripe;
}

export const APP_URL = env.NEXT_PUBLIC_APP_URL;
