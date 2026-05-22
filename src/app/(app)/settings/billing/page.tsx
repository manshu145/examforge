import Link from "next/link";
import { eq } from "drizzle-orm";
import { Check, CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireOnboardedUser } from "@/lib/auth";
import { startCheckout, openCustomerPortal } from "@/server/actions/billing";
import { formatDate, formatINR } from "@/lib/utils";
import { PRO_PRICES } from "@/lib/stripe/plans";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { user } = await requireOnboardedUser();
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });
  const plan = sub?.plan === "pro" ? "pro" : "free";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <CreditCard className="size-5 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Current plan
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {plan === "pro" ? "Pro" : "Free"}
              </p>
            </div>
            <Badge variant={plan === "pro" ? "default" : "secondary"}>
              {sub?.status ?? "active"}
            </Badge>
          </div>
          {plan === "pro" && sub?.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              {sub.cancelAtPeriodEnd
                ? `Cancels on ${formatDate(sub.currentPeriodEnd)}`
                : `Renews on ${formatDate(sub.currentPeriodEnd)}`}
            </p>
          )}
          {plan === "pro" ? (
            <form action={openCustomerPortal}>
              <Button type="submit" variant="outline">
                Manage subscription
              </Button>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <form action={startCheckoutMonthly}>
                <Button type="submit" className="w-full">
                  Upgrade — {formatINR(PRO_PRICES.monthly.amount)}/mo
                </Button>
              </form>
              <form action={startCheckoutYearly}>
                <Button type="submit" variant="outline" className="w-full">
                  Yearly — {formatINR(PRO_PRICES.yearly.amount)} (save 33%)
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {plan === "free" && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <p className="text-sm font-semibold">What you get with Pro</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                "Unlimited study plans",
                "Unlimited doubt solver",
                "Unlimited mock tests with adaptive difficulty",
                "Unlimited descriptive answer evaluations",
                "PYQ trends + Current Affairs analyzer",
                "Topic-level heatmaps & exportable reports",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Have a question?{" "}
        <Link href="mailto:hello@examforge.app" className="underline">
          hello@examforge.app
        </Link>
      </p>
    </div>
  );
}

// Server-action wrappers so the form's `action=` accepts a no-arg callable.
async function startCheckoutMonthly() {
  "use server";
  await startCheckout("monthly");
}
async function startCheckoutYearly() {
  "use server";
  await startCheckout("yearly");
}
