import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  MessageSquareText,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { studyPlans, studyPlanTasks } from "@/lib/db/schema";
import { requireOnboardedUser } from "@/lib/auth";
import { getExam, type ExamId } from "@/lib/exams";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * Post-onboarding home. Surfaces:
 *   - greeting + selected exam/year badge
 *   - 3 stat cards (year, daily hours, weak topics flagged)
 *   - the active plan (if any) with progress + quick links to today's tasks
 *   - 3 next-step CTAs for the upcoming features
 */
export default async function DashboardPage() {
  const { user, profile } = await requireOnboardedUser();
  const exam = profile.examId ? getExam(profile.examId as ExamId) : null;
  const firstName =
    (profile.fullName ?? user.fullName ?? "").split(" ")[0] || "there";

  const activePlan = await db.query.studyPlans.findFirst({
    where: and(
      eq(studyPlans.userId, user.id),
      eq(studyPlans.status, "active"),
    ),
  });

  let progress = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  let todayTasks: { id: string; title: string; estMinutes: number }[] = [];

  if (activePlan) {
    const tasks = await db
      .select()
      .from(studyPlanTasks)
      .where(eq(studyPlanTasks.planId, activePlan.id))
      .orderBy(asc(studyPlanTasks.scheduledDate), asc(studyPlanTasks.position));
    totalTasks = tasks.length;
    completedTasks = tasks.filter((t) => t.isDone).length;
    progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const todayStr = isoToday();
    todayTasks = tasks
      .filter((t) => t.scheduledDate === todayStr && !t.isDone)
      .slice(0, 3)
      .map((t) => ({ id: t.id, title: t.title, estMinutes: t.estMinutes }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Welcome ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-3 gap-1.5">
            <Sparkles className="size-3" />
            Welcome
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Hi {firstName}, ready to push forward?
          </h1>
          <p className="mt-2 text-muted-foreground">
            {activePlan
              ? "Pick up where you left off."
              : "Your AI mentor is set up. Pick where to start."}
          </p>
        </div>
        {exam && (
          <Badge variant="secondary" className="text-sm">
            Preparing for {exam.shortName} {profile.targetYear}
          </Badge>
        )}
      </div>

      {/* ── Stat row ────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<Target className="size-4" />}
          label="Target year"
          value={profile.targetYear?.toString() ?? "—"}
        />
        <Stat
          icon={<CalendarDays className="size-4" />}
          label="Daily hours"
          value={`${profile.dailyHours}h`}
        />
        <Stat
          icon={<ClipboardCheck className="size-4" />}
          label="Weak topics flagged"
          value={profile.weakTopicIds.length.toString()}
        />
      </div>

      {/* ── Active plan summary ─────────────────────────────────── */}
      {activePlan && (
        <Card className="mt-10">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Active study plan
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {activePlan.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(activePlan.startDate)} →{" "}
                  {formatDate(activePlan.endDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tracking-tight">
                  {progress}%
                </p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {completedTasks}/{totalTasks} done
                </p>
              </div>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Today</p>
                <ul className="space-y-1.5">
                  {todayTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <span>{t.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.estMinutes} min
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing pending for today. Nice.
              </p>
            )}

            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href="/planner">
                Open planner
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Next steps ─────────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">
          {activePlan ? "Other ways to learn" : "Get started"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {activePlan
            ? "Tools beyond the planner."
            : "These features ship in the upcoming steps."}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!activePlan && (
            <NextStepCard
              href="/planner/new"
              icon={<CalendarDays className="size-5" />}
              title="Generate your study plan"
              description="A daily schedule sized to your hours, weighted toward weak topics."
              cta="Open planner"
            />
          )}
          <NextStepCard
            href="/evaluator"
            icon={<ClipboardCheck className="size-5" />}
            title="Evaluate a descriptive answer"
            description="Paste a Mains-style answer; get a rubric breakdown and a model answer."
            cta="Try evaluator"
          />
          <NextStepCard
            href="/doubts"
            icon={<MessageSquareText className="size-5" />}
            title="Ask the doubt solver"
            description="Stuck? Ask anything from your syllabus. Exam-aware explanations."
            cta="Open chat"
          />
          {activePlan && (
            <NextStepCard
              href="/planner/new"
              icon={<Sparkles className="size-5" />}
              title="Regenerate your plan"
              description="Started a new chapter? Generate a fresh plan with updated focus."
              cta="New plan"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function NextStepCard({
  href,
  icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Card className="flex h-full flex-col transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-6">
        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="mt-5 font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-auto pt-6">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={href}>
              {cta}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
