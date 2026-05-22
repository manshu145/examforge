import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { PRO_PRICES } from "@/lib/stripe/plans";

export const metadata = { title: "Pricing" };
// Authed users see a "Manage in Settings" CTA; we need fresh auth state.
export const dynamic = "force-dynamic";

const FREE_FEATURES = [
  "1 active study plan",
  "5 doubt solver queries/day",
  "2 mock tests/month",
  "3 descriptive answer evaluations/month",
  "Basic progress analytics",
];

const PRO_FEATURES = [
  "Unlimited study plans",
  "Unlimited doubt solver",
  "Unlimited mock tests with adaptive difficulty",
  "Unlimited answer evaluations with priority model",
  "PYQ trends + Current Affairs analyzer",
  "Topic-level heatmaps & exportable reports",
  "Priority email support",
];

export default async function PricingPage() {
  // Authed users get routed to billing; new users go to signup.
  const user = await getCurrentUser();
  const proHref = user ? "/settings/billing" : "/signup?next=/settings/billing";

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          Pricing
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Honest pricing for serious aspirants
        </h1>
        <p className="mt-4 text-muted-foreground">
          Start free. Upgrade only when you need unlimited.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardContent className="flex flex-1 flex-col p-8">
            <div>
              <h2 className="text-lg font-semibold">Free</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started with the essentials.
              </p>
            </div>
            <div className="mt-6">
              <span className="text-4xl font-semibold tracking-tight">{formatINR(0)}</span>
              <span className="ml-1 text-sm text-muted-foreground">/ forever</span>
            </div>
            <ul className="mt-8 space-y-3 text-sm">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Button asChild variant="outline" className="w-full">
                <Link href={user ? "/dashboard" : "/signup"}>
                  {user ? "Open dashboard" : "Get started"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="relative flex flex-col border-primary/40 shadow-lg">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
          <CardContent className="flex flex-1 flex-col p-8">
            <div>
              <h2 className="text-lg font-semibold">Pro</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Everything, with priority AI.
              </p>
            </div>
            <div className="mt-6">
              <span className="text-4xl font-semibold tracking-tight">
                {formatINR(PRO_PRICES.monthly.amount)}
              </span>
              <span className="ml-1 text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              or {formatINR(PRO_PRICES.yearly.amount)}/year — save 33%
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Button asChild className="w-full">
                <Link href={proHref}>
                  {user ? "Upgrade to Pro" : "Start free, upgrade anytime"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-xs text-muted-foreground">
        Prices in Indian Rupees. GST included where applicable. Cancel anytime
        from your settings.
      </p>
    </div>
  );
}
