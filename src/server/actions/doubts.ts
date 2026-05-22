"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  doubtMessages,
  doubtThreads,
  exams,
  profiles,
  topics,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { assertQuota, logUsage } from "@/lib/quotas";
import { chatCompletion, AI_MODELS } from "@/lib/ai/provider";
import { buildDoubtSystemPrompt, PROMPT_VERSION } from "@/lib/ai/prompts/doubt";
import { truncateWords } from "@/lib/utils";

const askSchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().min(2).max(2000),
});

export type AskDoubtInput = z.infer<typeof askSchema>;
export type AskDoubtResult =
  | { ok: true; threadId: string }
  | { ok: false; error: string };

/**
 * Send a message in an existing thread, or create one. Persists user message,
 * calls the AI, persists the assistant message, logs usage. Non-streaming for
 * simplicity; UX wraps with a loading state.
 */
export async function askDoubt(input: AskDoubtInput): Promise<AskDoubtResult> {
  const user = await requireUser();
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const quota = await assertQuota(user.id, "doubt");
  if (!quota.ok) return { ok: false, error: quota.reason };

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });
  if (!profile?.examId) {
    return { ok: false, error: "Finish onboarding to use the doubt solver" };
  }
  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, profile.examId),
  });
  if (!exam) return { ok: false, error: "Exam not found" };

  // Create or load thread.
  let threadId = parsed.data.threadId;
  if (!threadId) {
    const [t] = await db
      .insert(doubtThreads)
      .values({
        userId: user.id,
        examId: profile.examId,
        title: truncateWords(parsed.data.message, 8),
      })
      .returning({ id: doubtThreads.id });
    threadId = t!.id;
  } else {
    const thread = await db.query.doubtThreads.findFirst({
      where: eq(doubtThreads.id, threadId),
    });
    if (!thread || thread.userId !== user.id) {
      return { ok: false, error: "Thread not found" };
    }
  }

  // Persist user message.
  await db.insert(doubtMessages).values({
    threadId,
    role: "user",
    content: parsed.data.message,
  });

  // Reload conversation history (capped to keep context small).
  const history = await db
    .select()
    .from(doubtMessages)
    .where(eq(doubtMessages.threadId, threadId))
    .orderBy(asc(doubtMessages.createdAt));

  const topicId = (
    await db.query.doubtThreads.findFirst({
      where: eq(doubtThreads.id, threadId),
    })
  )?.topicId;
  const topic = topicId
    ? await db.query.topics.findFirst({ where: eq(topics.id, topicId) })
    : null;

  const system = buildDoubtSystemPrompt({
    examName: exam.name,
    topicName: topic?.name,
  });

  const messages = [
    { role: "system" as const, content: system },
    ...history.slice(-12).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const ai = await chatCompletion({
    provider: AI_MODELS.doubt.provider,
    model: AI_MODELS.doubt.model,
    messages,
    temperature: 0.4,
    maxTokens: 800,
  });
  if (!ai.ok) {
    // Best-effort: leave the user's message persisted; surface the error.
    return { ok: false, error: ai.error };
  }

  await db.insert(doubtMessages).values({
    threadId,
    role: "assistant",
    content: ai.data.content,
    tokensIn: ai.usage.promptTokens,
    tokensOut: ai.usage.completionTokens,
  });

  // Bump thread updatedAt for sorting.
  await db
    .update(doubtThreads)
    .set({ updatedAt: new Date() })
    .where(eq(doubtThreads.id, threadId));

  await logUsage(user.id, "doubt", {
    promptTokens: ai.usage.promptTokens,
    completionTokens: ai.usage.completionTokens,
    totalTokens: ai.usage.totalTokens,
    model: ai.usage.model,
    provider: ai.usage.provider,
    latencyMs: ai.usage.latencyMs,
    promptVersion: PROMPT_VERSION,
  });

  revalidatePath("/doubts");
  revalidatePath(`/doubts/${threadId}`);
  return { ok: true, threadId };
}
