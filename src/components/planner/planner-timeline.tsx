import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "@/components/planner/task-card";
import { formatDate } from "@/lib/utils";

/**
 * Timeline view: tasks grouped by date, dates grouped by ISO week (server
 * component, no interactivity at this level -- TaskCard handles toggling).
 */
export type TimelineTask = {
  id: string;
  scheduledDate: string; // YYYY-MM-DD from Postgres `date`
  title: string;
  description: string | null;
  topicName: string | null;
  estMinutes: number;
  isDone: boolean;
  position: number;
};

export type TimelineWeekMeta = {
  label: string;
  goals: string[];
};

export function PlannerTimeline({
  tasks,
  weekMeta,
  startDate,
}: {
  tasks: TimelineTask[];
  weekMeta?: TimelineWeekMeta[];
  startDate: string; // plan.start_date
}) {
  const weeks = groupByWeek(tasks, startDate);

  return (
    <div className="space-y-8">
      {weeks.map((week, idx) => {
        const meta = weekMeta?.[idx];
        return (
          <section key={idx} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {meta?.label ?? `Week ${idx + 1}`}
              </h3>
              <Badge variant="outline" className="text-xs">
                {week.completed}/{week.total} done
              </Badge>
            </div>

            {meta?.goals && meta.goals.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {meta.goals.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            )}

            <div className="space-y-4">
              {week.days.map((day) => (
                <Card key={day.date}>
                  <CardContent className="space-y-3 p-4 sm:p-5">
                    <div className="flex items-center justify-between border-b pb-2">
                      <p className="text-sm font-medium">
                        {formatDate(day.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {day.tasks.reduce((sum, t) => sum + t.estMinutes, 0)} min
                        planned
                      </p>
                    </div>
                    <div className="space-y-2">
                      {day.tasks.map((t) => (
                        <TaskCard
                          key={t.id}
                          id={t.id}
                          title={t.title}
                          description={t.description}
                          topicName={t.topicName}
                          estMinutes={t.estMinutes}
                          isDone={t.isDone}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────

type DayBucket = { date: string; tasks: TimelineTask[] };
type WeekBucket = {
  days: DayBucket[];
  total: number;
  completed: number;
};

/**
 * Group tasks into 7-day windows, anchored on `startDate`. We use the plan's
 * own start as the anchor (not Monday) so "Week 1" feels right regardless of
 * what day of the week the user starts on.
 */
function groupByWeek(tasks: TimelineTask[], startDate: string): WeekBucket[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const sorted = [...tasks].sort((a, b) =>
    a.scheduledDate === b.scheduledDate
      ? a.position - b.position
      : a.scheduledDate < b.scheduledDate
        ? -1
        : 1,
  );

  const weeks = new Map<number, DayBucket[]>();
  for (const t of sorted) {
    const dayMs = new Date(`${t.scheduledDate}T00:00:00Z`).getTime();
    const dayDelta = Math.round((dayMs - start) / 86_400_000);
    const weekIdx = Math.max(0, Math.floor(dayDelta / 7));
    if (!weeks.has(weekIdx)) weeks.set(weekIdx, []);
    const days = weeks.get(weekIdx)!;
    let bucket = days.find((d) => d.date === t.scheduledDate);
    if (!bucket) {
      bucket = { date: t.scheduledDate, tasks: [] };
      days.push(bucket);
    }
    bucket.tasks.push(t);
  }

  const out: WeekBucket[] = [];
  for (const [, days] of [...weeks.entries()].sort((a, b) => a[0] - b[0])) {
    days.sort((a, b) => (a.date < b.date ? -1 : 1));
    const total = days.reduce((s, d) => s + d.tasks.length, 0);
    const completed = days.reduce(
      (s, d) => s + d.tasks.filter((t) => t.isDone).length,
      0,
    );
    out.push({ days, total, completed });
  }
  return out;
}
