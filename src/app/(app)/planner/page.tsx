import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { studyPlans, studyPlanTasks } from "@/lib/db/schema";
import { requireOnboardedUser } from "@/lib/auth";
import {
  PlannerTimeline,
  type TimelineTask,
  type TimelineWeekMeta,
} from "@/components/planner/planner-timeline";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Study planner" };
// Revalidation is driven by `revalidatePath` from the togglePlanTask action.
export const dynamic = "force-dynamic";

/**
 * Active plan view, or empty state with a CTA to /planner/new.
 */
export default async function PlannerPage() {
  const { user } = await requireOnboardedUser();

  const plan = await db.query.studyPlans.findFirst({
    where: and(eq(studyPlans.userId, user.id), eq(studyPlans.status, "active")),
  });

  if (!plan) return <EmptyState />;

  // Pull tasks + topic names in parallel for the active plan.
  const tasks = await db
    .select()
    .from(studyPlanTasks)
    .where(eq(studyPlanTasks.planId, plan.id))
    .orderBy(asc(studyPlanTasks.scheduledDate), asc(studyPlanTasks.position));

  const topicIds = Array.from(
    new Set(tasks.map((t) => t.topicId).filter((x): x is string => !!x)),
  );
  const topicRows = topicIds.length
    ? await db.query.topics.findMany({
        where: (t, { inArray }) => inArray(t.id, topicIds),
      })
    : [];
  const topicNameById = new Map(topicRows.map((t) => [t.id, t.name]));

  const timelineTasks: TimelineTask[] = tasks.map((t) => ({
    id: t.id,
    scheduledDate: t.scheduledDate,
    title: t.title,
    description: t.description,
    topicName: t.topicId ? (topicNameById.get(t.topicId) ?? null) : null,
    estMinutes: t.estMinutes,
    isDone: t.isDone,
    position: t.position,
  }));

  const weekMeta = extractWeekMeta(plan.aiMetadata);
  const completed = timelineTasks.filter((t) => t.isDone).length;
  const progress =
    timelineTasks.length === 0
      ? 0
      : Math.round((completed / timelineTasks.length) * 100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="mb-3 gap-1.5">
            <Sparkles className="size-3" />
            Active plan
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">{plan.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight">{progress}%</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {completed}/{timelineTasks.length} tasks
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/planner/new">
              <Sparkles className="size-4" />
              Regenerate
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-10">
        <PlannerTimeline
          tasks={timelineTasks}
          weekMeta={weekMeta}
          startDate={plan.startDate}
        />
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="space-y-5 p-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              No active study plan yet
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate one in 30 seconds. Your AI mentor will weight weak
              topics and size each day to your daily hours.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/planner/new">
              <Sparkles className="size-4" />
              Generate my plan
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Week metadata extractor (defensive against schema drift) ────────────

function extractWeekMeta(meta: unknown): TimelineWeekMeta[] | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const weeks = (meta as Record<string, unknown>).weeks;
  if (!Array.isArray(weeks)) return undefined;
  const valid: TimelineWeekMeta[] = [];
  for (const w of weeks) {
    if (!w || typeof w !== "object") continue;
    const obj = w as Record<string, unknown>;
    if (typeof obj.label === "string" && Array.isArray(obj.goals)) {
      valid.push({
        label: obj.label,
        goals: obj.goals.filter((g): g is string => typeof g === "string"),
      });
    }
  }
  return valid.length ? valid : undefined;
}
