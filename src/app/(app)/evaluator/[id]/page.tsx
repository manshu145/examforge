import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { evaluations } from "@/lib/db/schema";
import { requireOnboardedUser } from "@/lib/auth";
import { RubricView } from "@/components/evaluator/rubric-view";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireOnboardedUser();
  const { id } = await params;
  const evalRow = await db.query.evaluations.findFirst({
    where: eq(evaluations.id, id),
  });
  if (!evalRow || evalRow.userId !== user.id) notFound();

  const rubric = (evalRow.rubric as Record<string, number>) ?? {};
  const score = Number(evalRow.score);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/evaluator">
          <ArrowLeft className="size-4" /> Back
        </Link>
      </Button>

      <div>
        <Badge className="mb-3">Evaluation</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">
          Score: {score.toFixed(1)} / 10
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(evalRow.createdAt)} · {evalRow.wordCount} words ·{" "}
          {evalRow.model ?? "AI"}
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Question
            </h2>
            <p className="mt-2 text-sm leading-relaxed">{evalRow.question}</p>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your answer
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {evalRow.answer}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Rubric
              </h2>
              <div className="mt-4">
                <RubricView rubric={rubric} />
              </div>
            </CardContent>
          </Card>
          {evalRow.improvementNotes && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  How to improve
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {evalRow.improvementNotes}
                </p>
              </CardContent>
            </Card>
          )}
          {evalRow.modelAnswer && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Model answer
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {evalRow.modelAnswer}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
