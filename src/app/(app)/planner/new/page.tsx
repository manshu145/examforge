import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireOnboardedUser } from "@/lib/auth";
import { getExam, type ExamId } from "@/lib/exams";
import { assertQuota, FREE_LIMITS } from "@/lib/quotas";
import { NewPlanForm } from "@/components/planner/new-plan-form";

export const metadata = { title: "New study plan" };
export const dynamic = "force-dynamic";

/**
 * Server component: shows a quota banner if the free user is at the cap,
 * then renders the form. We don't block at the page level -- the action
 * also gates so this is just a friendlier UX.
 */
export default async function NewPlanPage() {
  const { user, profile } = await requireOnboardedUser();

  const exam = profile.examId ? getExam(profile.examId as ExamId) : null;
  const quota = await assertQuota(user.id, "plan");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/planner">
          <ArrowLeft className="size-4" />
          Back to plans
        </Link>
      </Button>

      <h1 className="text-3xl font-semibold tracking-tight">
        Generate a new study plan
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your AI mentor will personalise a day-by-day plan to your weak topics
        and daily hours.
      </p>

      {!quota.ok && (
        <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium">Free plan limit reached</p>
          <p className="mt-1 text-muted-foreground">{quota.reason}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
        </div>
      )}

      {quota.ok && quota.plan === "free" && (
        <Badge variant="secondary" className="mt-4">
          {FREE_LIMITS.plan.count - quota.used} of {FREE_LIMITS.plan.count}{" "}
          generations left this month (Free plan)
        </Badge>
      )}

      <div className="mt-8">
        {exam && (
          <NewPlanForm
            examShortName={exam.shortName}
            dailyHours={profile.dailyHours}
          />
        )}
      </div>
    </div>
  );
}
