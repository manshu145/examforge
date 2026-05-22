/**
 * Zod schemas for structured AI output.
 *
 * Every AI call that returns JSON validates against one of these. Putting
 * them in a single file keeps the contract visible and lets us iterate the
 * shape (and the prompt) together.
 */

import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────
// Planner output
// ──────────────────────────────────────────────────────────────────────────

export const plannerTaskSchema = z.object({
  /** ISO date YYYY-MM-DD. We re-validate this falls inside [start, end]. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  title: z.string().min(3).max(120),
  description: z.string().max(400).optional().default(""),
  /** Must be a real topic id from the catalog passed into the prompt. */
  topicId: z.string().nullable().optional().default(null),
  estMinutes: z.number().int().min(15).max(240),
  position: z.number().int().min(0).max(20).optional().default(0),
});

export const plannerWeekSchema = z.object({
  label: z.string().min(3).max(80),
  goals: z.array(z.string().min(3).max(160)).min(1).max(5),
});

export const plannerOutputSchema = z.object({
  title: z.string().min(3).max(120),
  weeks: z.array(plannerWeekSchema).min(1).max(8),
  tasks: z.array(plannerTaskSchema).min(1).max(120),
});

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;
export type PlannerTask = z.infer<typeof plannerTaskSchema>;

// ──────────────────────────────────────────────────────────────────────────
// Evaluator output (used in Step 6)
// ──────────────────────────────────────────────────────────────────────────

export const rubricSchema = z.object({
  introduction: z.number().min(0).max(10),
  body: z.number().min(0).max(10),
  conclusion: z.number().min(0).max(10),
  structure: z.number().min(0).max(10),
  factualAccuracy: z.number().min(0).max(10),
  language: z.number().min(0).max(10),
});

export const evaluationOutputSchema = z.object({
  rubric: rubricSchema,
  /** 0..10 aggregated. We can recompute, but the model produces a sanity check. */
  score: z.number().min(0).max(10),
  modelAnswer: z.string().min(20),
  improvementNotes: z.string().min(20),
});

export type EvaluationOutput = z.infer<typeof evaluationOutputSchema>;
