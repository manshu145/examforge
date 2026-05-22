"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  profiles,
  studyPlans,
  studyPlanTasks,
  subjects,
  exams,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { assertQuota, logUsage } from "@/lib/quotas";
import { generateJSON, AI_MODELS } from "@/lib/ai/provider";
import { plannerOutputSchema } from "@/lib/ai/schemas";
import {
  buildPlannerPrompt,
  PROMPT_VERSION,
  type TopicCatalogEntry,
} from "@/lib/ai/prompts/planner";

/**
 * Server actions for the AI Study Planner.
 *
 *   generatePlan   -- AI-generates a plan + tasks, archives any active plan,
 *                     logs token usage, returns { ok, planId } or { ok: false }.
 *   togglePlanTask -- flips a task's is_done state with ownership check.
 *   archivePlan    -- soft-archives a plan (status = 'archived').
 */

// ──────────────────────────────────────────────────────────────────────────
// generatePlan
// ──────────────────────────────────────────────────────────────────────────

const generatePlanSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (v) => {
      const days = daysBetween(v.startDate, v.endDate);
      return days >= 7 && days <= 56;
    },
    {
      message: "Plan window must be between 7 and 56 days",
      path: ["endDate"],
    },
  );

export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;
export type GeneratePlanResult =
  | { ok: true; planId: string }
  | { ok: false; error: string };

export async function generatePlan(
  input: GeneratePlanInput,
): Promise<GeneratePlanResult> {
  const user = await requireUser();

  const parsed = generatePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Quota gate.
  const quota = await assertQuota(user.id, "plan");
  if (!quota.ok) return { ok: false, error: quota.reason };

  // Load profile + exam catalog.
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });
  if (!profile?.examId) {
    return { ok: false, error: "Finish onboarding before generating a plan" };
  }

  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, profile.examId),
  });
  if (!exam) return { ok: false, error: "Exam not found" };

  const examSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.examId, profile.examId))
    .orderBy(asc(subjects.position));

  const subjectIds = examSubjects.map((s) => s.id);
  const allTopics = subjectIds.length
    ? await db.query.topics.findMany({
        where: (t, { inArray }) => inArray(t.subjectId, subjectIds),
      })
    : [];

  if (!allTopics.length) {
    return {
      ok: false,
      error: "No topics found for your exam. Run `npm run db:seed` and try again.",
    };
  }

  const subjectName = new Map(examSubjects.map((s) => [s.id, s.name]));
  const weakSet = new Set(profile.weakTopicIds);
  const catalog: TopicCatalogEntry[] = allTopics.map((t) => ({
    id: t.id,
    name: t.name,
    subject: subjectName.get(t.subjectId) ?? "—",
    isWeak: weakSet.has(t.id),
  }));

  const totalDays = daysBetween(parsed.data.startDate, parsed.data.endDate);
  const { system, user: userPrompt } = buildPlannerPrompt({
    examName: exam.name,
    examShortName: exam.shortName,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    totalDays,
    dailyHours: profile.dailyHours,
    catalog,
    notes: parsed.data.notes,
  });

  const ai = await generateJSON({
    provider: AI_MODELS.planner.provider,
    model: AI_MODELS.planner.model,
    systemPrompt: system,
    userPrompt,
    schema: plannerOutputSchema,
    temperature: 0.5,
    maxTokens: 6000,
  });

  if (!ai.ok) return { ok: false, error: ai.error };

  // Drop tasks that fall outside the window or reference unknown topic ids.
  const validTopicIds = new Set(allTopics.map((t) => t.id));
  const cleanTasks = ai.data.tasks.filter((t) => {
    if (t.date < parsed.data.startDate || t.date > parsed.data.endDate) return false;
    if (t.topicId && !validTopicIds.has(t.topicId)) return false;
    return true;
  });
  if (cleanTasks.length === 0) {
    return { ok: false, error: "AI generated no usable tasks. Please try again." };
  }

  // Archive any prior active plan(s) so there's only one active at a time.
  await db
    .update(studyPlans)
    .set({ status: "archived" })
    .where(
      and(eq(studyPlans.userId, user.id), eq(studyPlans.status, "active")),
    );

  const [plan] = await db
    .insert(studyPlans)
    .values({
      userId: user.id,
      examId: profile.examId,
      title: parsed.data.title ?? ai.data.title,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: "active",
      generatedBy: "ai",
      aiMetadata: {
        promptVersion: PROMPT_VERSION,
        provider: ai.usage.provider,
        model: ai.usage.model,
        latencyMs: ai.usage.latencyMs,
        weeks: ai.data.weeks,
        notes: parsed.data.notes ?? null,
      },
    })
    .returning({ id: studyPlans.id });

  await db.insert(studyPlanTasks).values(
    cleanTasks.map((t) => ({
      planId: plan!.id,
      scheduledDate: t.date,
      title: t.title,
      description: t.description ?? "",
      topicId: t.topicId ?? null,
      estMinutes: t.estMinutes,
      position: t.position ?? 0,
    })),
  );

  await logUsage(user.id, "plan", {
    promptTokens: ai.usage.promptTokens,
    completionTokens: ai.usage.completionTokens,
    totalTokens: ai.usage.totalTokens,
    model: ai.usage.model,
    provider: ai.usage.provider,
    latencyMs: ai.usage.latencyMs,
    taskCount: cleanTasks.length,
    promptVersion: PROMPT_VERSION,
  });

  revalidatePath("/planner");
  revalidatePath("/dashboard");
  return { ok: true, planId: plan!.id };
}

// ──────────────────────────────────────────────────────────────────────────
// togglePlanTask
// ──────────────────────────────────────────────────────────────────────────

export async function togglePlanTask(
  taskId: string,
  isDone: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();

  // Verify the task belongs to a plan owned by this user.
  const task = await db.query.studyPlanTasks.findFirst({
    where: eq(studyPlanTasks.id, taskId),
  });
  if (!task) return { ok: false, error: "Task not found" };

  const plan = await db.query.studyPlans.findFirst({
    where: eq(studyPlans.id, task.planId),
  });
  if (!plan || plan.userId !== user.id) {
    return { ok: false, error: "Not authorised" };
  }

  await db
    .update(studyPlanTasks)
    .set({
      isDone,
      completedAt: isDone ? new Date() : null,
    })
    .where(eq(studyPlanTasks.id, taskId));

  revalidatePath("/planner");
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// archivePlan
// ──────────────────────────────────────────────────────────────────────────

export async function archivePlan(
  planId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const plan = await db.query.studyPlans.findFirst({
    where: eq(studyPlans.id, planId),
  });
  if (!plan || plan.userId !== user.id) {
    return { ok: false, error: "Not authorised" };
  }

  await db
    .update(studyPlans)
    .set({ status: "archived" })
    .where(eq(studyPlans.id, planId));

  revalidatePath("/planner");
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────────────

/** Inclusive day count between two YYYY-MM-DD dates. */
function daysBetween(a: string, b: string): number {
  const ms =
    new Date(`${b}T00:00:00Z`).getTime() -
    new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}
