"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { evaluations, exams, profiles, topics } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { assertQuota, logUsage } from "@/lib/quotas";
import { generateJSON, AI_MODELS } from "@/lib/ai/provider";
import { evaluationOutputSchema } from "@/lib/ai/schemas";
import { buildEvaluatorPrompt, PROMPT_VERSION } from "@/lib/ai/prompts/evaluator";

const inputSchema = z.object({
  question: z.string().min(10).max(2000),
  answer: z.string().min(50).max(8000),
  topicId: z.string().optional().nullable(),
});

export type EvaluateInput = z.infer<typeof inputSchema>;
export type EvaluateResult =
  | { ok: true; evaluationId: string }
  | { ok: false; error: string };

export async function evaluateAnswer(
  input: EvaluateInput,
): Promise<EvaluateResult> {
  const user = await requireUser();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const quota = await assertQuota(user.id, "evaluation");
  if (!quota.ok) return { ok: false, error: quota.reason };

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });
  if (!profile?.examId) {
    return { ok: false, error: "Finish onboarding to use the evaluator" };
  }
  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, profile.examId),
  });
  if (!exam) return { ok: false, error: "Exam not found" };

  const topic = parsed.data.topicId
    ? await db.query.topics.findFirst({ where: eq(topics.id, parsed.data.topicId) })
    : null;

  const { system, user: userPrompt } = buildEvaluatorPrompt({
    examName: exam.name,
    question: parsed.data.question,
    answer: parsed.data.answer,
    topicName: topic?.name,
  });

  const ai = await generateJSON({
    provider: AI_MODELS.evaluator.provider,
    model: AI_MODELS.evaluator.model,
    systemPrompt: system,
    userPrompt,
    schema: evaluationOutputSchema,
    temperature: 0.3,
    maxTokens: 1800,
  });
  if (!ai.ok) return { ok: false, error: ai.error };

  const wordCount = parsed.data.answer.trim().split(/\s+/).filter(Boolean).length;
  const [row] = await db
    .insert(evaluations)
    .values({
      userId: user.id,
      examId: profile.examId,
      topicId: parsed.data.topicId ?? null,
      question: parsed.data.question,
      answer: parsed.data.answer,
      wordCount,
      rubric: ai.data.rubric,
      score: ai.data.score.toString(),
      modelAnswer: ai.data.modelAnswer,
      improvementNotes: ai.data.improvementNotes,
      model: ai.usage.model,
    })
    .returning({ id: evaluations.id });

  await logUsage(user.id, "evaluation", {
    promptTokens: ai.usage.promptTokens,
    completionTokens: ai.usage.completionTokens,
    totalTokens: ai.usage.totalTokens,
    model: ai.usage.model,
    provider: ai.usage.provider,
    latencyMs: ai.usage.latencyMs,
    score: ai.data.score,
    promptVersion: PROMPT_VERSION,
  });

  revalidatePath("/evaluator");
  return { ok: true, evaluationId: row!.id };
}
