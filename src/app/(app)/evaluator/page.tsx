import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { evaluations } from "@/lib/db/schema";
import { requireOnboardedUser } from "@/lib/auth";
import { assertQuota, FREE_LIMITS } from "@/lib/quotas";
import { EvaluatorForm } from "@/components/evaluator/evaluator-form";
import { formatDate, truncateWords } from "@/lib/utils";

export const metadata = { title: "Answer evaluator" };
export const dynamic = "force-dynamic";

export default async function EvaluatorPage() {
  const { user } = await requireOnboardedUser();
  const quota = await assertQuota(user.id, "evaluation");
  const history = await db
    .select({
      id: evaluations.id,
      question: evaluations.question,
      score: evaluations.score,
      createdAt: evaluations.createdAt,
    })
    .from(evaluations)
    .where(eq(evaluations.userId, user.id))
    .orderBy(desc(evaluations.createdAt))
    .limit(10);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-5 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Answer evaluator</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste a Mains-style question and your answer. Get a 6-dimension rubric, a model
        answer, and concrete improvement notes.
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
          {FREE_LIMITS.evaluation.count - quota.used} of{" "}
          {FREE_LIMITS.evaluation.count} evaluations left this month (Free plan)
        </Badge>
      )}

      <div className="mt-8">{quota.ok ? <EvaluatorForm /> : null}</div>

      {history.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold">Recent evaluations</h2>
          <div className="mt-4 space-y-3">
            {history.map((h) => (
              <Link key={h.id} href={`/evaluator/${h.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {truncateWords(h.question, 18)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant="default" className="tabular-nums">
                        {Number(h.score).toFixed(1)} / 10
                      </Badge>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
