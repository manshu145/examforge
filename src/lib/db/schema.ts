/**
 * ExamForge database schema (Drizzle ORM, Postgres / Supabase).
 *
 * Conventions
 * -----------
 * - Snake_case in the database, camelCase in TypeScript (Drizzle handles the bridge).
 * - Soft enums: `text` columns documented with the allowed values, so we can extend
 *   them without a migration. Where the value matters for correctness (e.g. role,
 *   status), it's still validated at the application layer with Zod.
 * - Every user-owned table has a `userId` column for RLS — see `rls.sql`.
 * - JSONB is used for AI artifacts (rubric, ai_metadata) where the shape evolves.
 *
 * Foreign keys to `auth.users`
 * ----------------------------
 * Supabase exposes user identity in the `auth.users` table, which lives in the
 * `auth` schema. We reference it via a phantom `pgSchema("auth")` table here so
 * Drizzle emits the FK constraint correctly. `schemaFilter: ["public"]` in
 * drizzle.config.ts ensures drizzle-kit never tries to manage that schema.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Phantom reference to auth.users (managed by Supabase) ───────────────────

const authSchema = pgSchema("auth");
const usersInAuth = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// ─── Reference tables ────────────────────────────────────────────────────────
// Static-ish data: exams, subjects, topics. Public-readable, service-role-write.
// Seeded via `scripts/seed.ts`.

export const exams = pgTable("exams", {
  /** e.g. 'upsc' | 'neet' | 'jee' | 'state_psc'. Slug-style for FK use. */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subjects = pgTable(
  "subjects",
  {
    /** e.g. 'upsc_gs1', 'neet_physics'. Globally unique slug. */
    id: text("id").primaryKey(),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Display order within the exam. */
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("subjects_exam_idx").on(t.examId)],
);

export const topics = pgTable(
  "topics",
  {
    /** e.g. 'upsc_gs1_modern_history'. */
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** 1 (foundational) -> 5 (advanced). Used for adaptive difficulty. */
    difficulty: integer("difficulty").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("topics_subject_idx").on(t.subjectId)],
);

// ─── Identity & Billing ──────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  /** PK == auth.users.id. Cascade-delete when the auth user is removed. */
  id: uuid("id")
    .primaryKey()
    .references(() => usersInAuth.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  /** Selected during onboarding; references exams.id. */
  examId: text("exam_id").references(() => exams.id, { onDelete: "set null" }),
  /** e.g. 2026 - the year the student is targeting. */
  targetYear: integer("target_year"),
  /** Hours per day the student can dedicate. Used by the planner. */
  dailyHours: integer("daily_hours").notNull().default(4),
  /** topic ids the user flagged as weak; used by planner + adaptive mocks. */
  weakTopicIds: text("weak_topic_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** Set once the user finishes the onboarding wizard. */
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Mirror of Stripe state. The webhook (`/api/stripe/webhook`) is the single
 * writer; user-facing pages only read from this table.
 */
export const subscriptions = pgTable("subscriptions", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  /** 'free' | 'pro' */
  plan: text("plan").notNull().default("free"),
  /** 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' */
  status: text("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Append-only ledger. Drives free-tier quota enforcement and analytics.
 * Never updated; only inserted. Aggregations run via SQL (cheap on this index).
 */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** 'doubt' | 'evaluation' | 'mock' | 'plan' */
    feature: text("feature").notNull(),
    /** Free-form: { tokens_in, tokens_out, model, latency_ms, ... }. */
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("usage_user_feature_time_idx").on(t.userId, t.feature, t.createdAt),
  ],
);

// ─── Study Planner ───────────────────────────────────────────────────────────

export const studyPlans = pgTable(
  "study_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id),
    title: text("title").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    /** 'active' | 'archived' | 'completed'. Only one 'active' per user (enforced in app). */
    status: text("status").notNull().default("active"),
    /** 'ai' | 'manual'. */
    generatedBy: text("generated_by").notNull().default("ai"),
    /** { model, prompt_version, hours_per_day, weak_topics, ... } */
    aiMetadata: jsonb("ai_metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("plans_user_status_idx").on(t.userId, t.status)],
);

export const studyPlanTasks = pgTable(
  "study_plan_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    scheduledDate: date("scheduled_date").notNull(),
    topicId: text("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    estMinutes: integer("est_minutes").notNull().default(60),
    resourceUrl: text("resource_url"),
    isDone: boolean("is_done").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Display order within a single date. */
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("plan_tasks_plan_date_idx").on(t.planId, t.scheduledDate)],
);

// ─── Mock Tests ──────────────────────────────────────────────────────────────

export const mockTests = pgTable(
  "mock_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id),
    title: text("title").notNull(),
    /** 'easy' | 'medium' | 'hard' | 'mixed'. */
    difficulty: text("difficulty").notNull().default("mixed"),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    /** True for platform-curated tests; false for user-generated drills. */
    isOfficial: boolean("is_official").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("mock_tests_exam_idx").on(t.examId)],
);

export const mockQuestions = pgTable(
  "mock_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => mockTests.id, { onDelete: "cascade" }),
    topicId: text("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    /** 'mcq' | 'descriptive'. */
    type: text("type").notNull(),
    prompt: text("prompt").notNull(),
    /** For MCQ: ["option A", "option B", ...]. Null for descriptive. */
    options: jsonb("options"),
    /** For MCQ: 0..3 (index of correct option). */
    correctOption: integer("correct_option"),
    /** For descriptive: a model answer the AI evaluator can compare against. */
    modelAnswer: text("model_answer"),
    marks: integer("marks").notNull().default(1),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("mock_questions_test_idx").on(t.testId)],
);

export const mockAttempts = pgTable(
  "mock_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    testId: uuid("test_id")
      .notNull()
      .references(() => mockTests.id),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    /** Awarded marks. Null until submitted. */
    score: numeric("score"),
    totalMarks: numeric("total_marks"),
    durationSeconds: integer("duration_seconds"),
    /** 'in_progress' | 'submitted' | 'abandoned'. */
    status: text("status").notNull().default("in_progress"),
  },
  (t) => [index("mock_attempts_user_idx").on(t.userId)],
);

export const mockAnswers = pgTable(
  "mock_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => mockAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => mockQuestions.id),
    /** For MCQ. */
    selectedOption: integer("selected_option"),
    /** For descriptive answers. */
    writtenAnswer: text("written_answer"),
    isCorrect: boolean("is_correct"),
    awardedMarks: numeric("awarded_marks"),
    /** For descriptive: { score, rubric, model_answer, improvement_notes }. */
    aiFeedback: jsonb("ai_feedback"),
  },
  (t) => [
    index("mock_answers_attempt_idx").on(t.attemptId),
    uniqueIndex("mock_answers_attempt_question_unique").on(
      t.attemptId,
      t.questionId,
    ),
  ],
);

// ─── Descriptive Evaluator (standalone, not part of a mock) ──────────────────

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    examId: text("exam_id").references(() => exams.id, {
      onDelete: "set null",
    }),
    topicId: text("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    wordCount: integer("word_count"),
    /**
     * Structured rubric output, e.g.:
     * {
     *   introduction: 7, body: 8, conclusion: 6, structure: 7,
     *   factual_accuracy: 8, language: 7
     * }
     * Each on a 0..10 scale; UI renders these as bars.
     */
    rubric: jsonb("rubric").notNull(),
    /** Final aggregated score, 0..10. */
    score: numeric("score").notNull(),
    modelAnswer: text("model_answer"),
    improvementNotes: text("improvement_notes"),
    /** Which AI model produced the evaluation (for audit). */
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("evaluations_user_time_idx").on(t.userId, t.createdAt)],
);

// ─── Doubt Solver ────────────────────────────────────────────────────────────

export const doubtThreads = pgTable(
  "doubt_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title"),
    examId: text("exam_id").references(() => exams.id, {
      onDelete: "set null",
    }),
    topicId: text("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("doubt_threads_user_idx").on(t.userId)],
);

export const doubtMessages = pgTable(
  "doubt_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => doubtThreads.id, { onDelete: "cascade" }),
    /** 'user' | 'assistant' | 'system'. */
    role: text("role").notNull(),
    content: text("content").notNull(),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("doubt_messages_thread_idx").on(t.threadId, t.createdAt)],
);

// ─── Insights: PYQs + Current Affairs ────────────────────────────────────────

export const pyqs = pgTable(
  "pyqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id),
    year: integer("year").notNull(),
    /** Free text label, e.g. 'GS1', 'Prelims', 'Mains-Optional'. */
    paper: text("paper"),
    topicId: text("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    question: text("question").notNull(),
    answer: text("answer"),
    /** AI-derived: { trend_tags, frequency, predicted_next_year, ... } */
    aiAnalysis: jsonb("ai_analysis"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pyqs_exam_year_idx").on(t.examId, t.year),
    index("pyqs_topic_idx").on(t.topicId),
  ],
);

export const currentAffairs = pgTable(
  "current_affairs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    /** Which exams this item is relevant to. */
    examIds: text("exam_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    topicId: text("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    headline: text("headline").notNull(),
    summary: text("summary").notNull(),
    sourceUrl: text("source_url"),
    /** 1..5; sorts the daily feed. */
    importance: integer("importance").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("current_affairs_date_idx").on(t.date)],
);

// ─── Type exports for app code ───────────────────────────────────────────────
// Use $inferSelect / $inferInsert in code rather than re-deriving by hand.

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type StudyPlanTask = typeof studyPlanTasks.$inferSelect;
export type MockTest = typeof mockTests.$inferSelect;
export type MockQuestion = typeof mockQuestions.$inferSelect;
export type MockAttempt = typeof mockAttempts.$inferSelect;
export type MockAnswer = typeof mockAnswers.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type DoubtThread = typeof doubtThreads.$inferSelect;
export type DoubtMessage = typeof doubtMessages.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Pyq = typeof pyqs.$inferSelect;
export type CurrentAffair = typeof currentAffairs.$inferSelect;
