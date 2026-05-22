"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  completeOnboarding,
  type OnboardingInput,
} from "@/server/actions/onboarding";

export type ExamWithTopics = {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  subjects: {
    id: string;
    name: string;
    topics: { id: string; name: string }[];
  }[];
};

type Step = 1 | 2 | 3;

const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3];

/**
 * Three-step onboarding:
 *   1. Pick your exam (radio cards).
 *   2. Confirm name + target year + daily hours.
 *   3. Mark weak topics (checkboxes, grouped by subject).
 *
 * State lives in this component; we only hit the server on the final submit.
 * Each step has its own validation gate before "Next" is enabled.
 */
export function OnboardingWizard({
  exams,
  initialFullName,
}: {
  exams: ExamWithTopics[];
  initialFullName: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();

  const [examId, setExamId] = useState<string | null>(null);
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [targetYear, setTargetYear] = useState<number>(CURRENT_YEAR + 1);
  const [dailyHours, setDailyHours] = useState<number>(4);
  const [weakTopicIds, setWeakTopicIds] = useState<Set<string>>(new Set());

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === examId) ?? null,
    [exams, examId],
  );

  // Step gates
  const canAdvanceFrom1 = !!examId;
  const canAdvanceFrom2 =
    fullName.trim().length >= 2 && targetYear >= CURRENT_YEAR && dailyHours > 0;

  function toggleTopic(topicId: string) {
    setWeakTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  function onSubmit() {
    if (!examId) return;
    const input: OnboardingInput = {
      examId: examId as OnboardingInput["examId"],
      targetYear,
      dailyHours,
      weakTopicIds: Array.from(weakTopicIds),
      fullName: fullName.trim() || undefined,
    };

    startTransition(async () => {
      const res = await completeOnboarding(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("You're all set", {
        description: "Generating your dashboard...",
      });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      {/* ── Progress header ───────────────────────────────────────────── */}
      <div className="mb-10">
        <Badge className="mb-3 gap-1.5">
          <Sparkles className="size-3" />
          Setting things up
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Let&apos;s personalise your prep
        </h1>
        <p className="mt-2 text-muted-foreground">
          Three quick steps. We use this to plan smarter daily tasks for you.
        </p>

        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border text-xs font-medium transition-colors",
                  step === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : step > n
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-background",
                )}
              >
                {step > n ? <CheckCircle2 className="size-3.5" /> : n}
              </span>
              {n < 3 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    step > n ? "bg-primary/50" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step content ──────────────────────────────────────────────── */}
      {step === 1 && (
        <Step1Card
          exams={exams}
          selectedExamId={examId}
          onSelect={setExamId}
        />
      )}

      {step === 2 && (
        <Step2Card
          fullName={fullName}
          onFullName={setFullName}
          targetYear={targetYear}
          onTargetYear={setTargetYear}
          dailyHours={dailyHours}
          onDailyHours={setDailyHours}
        />
      )}

      {step === 3 && selectedExam && (
        <Step3Card
          exam={selectedExam}
          weakTopicIds={weakTopicIds}
          onToggle={toggleTopic}
        />
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
          disabled={step === 1 || isPending}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => ((s + 1) as Step))}
            disabled={
              (step === 1 && !canAdvanceFrom1) ||
              (step === 2 && !canAdvanceFrom2)
            }
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Finish setup
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────

function Step1Card({
  exams,
  selectedExamId,
  onSelect,
}: {
  exams: ExamWithTopics[];
  selectedExamId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Which exam are you preparing for?</h2>
          <p className="text-sm text-muted-foreground">You can switch this later.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {exams.map((exam) => {
            const selected = selectedExamId === exam.id;
            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => onSelect(exam.id)}
                aria-pressed={selected}
                className={cn(
                  "group rounded-lg border p-4 text-left transition-all",
                  "hover:border-primary/50 hover:shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{exam.shortName}</span>
                  {selected && (
                    <CheckCircle2 className="size-4 text-primary" />
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {exam.name}
                </p>
                {exam.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {exam.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────

function Step2Card({
  fullName,
  onFullName,
  targetYear,
  onTargetYear,
  dailyHours,
  onDailyHours,
}: {
  fullName: string;
  onFullName: (v: string) => void;
  targetYear: number;
  onTargetYear: (v: number) => void;
  dailyHours: number;
  onDailyHours: (v: number) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">A bit about you</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ll use this to size your daily plan.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Your name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => onFullName(e.target.value)}
            placeholder="Aarav Sharma"
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label>Target exam year</Label>
          <div className="grid grid-cols-4 gap-2">
            {YEAR_OPTIONS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => onTargetYear(y)}
                aria-pressed={targetYear === y}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  targetYear === y
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background",
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Hours you can study per day</Label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {HOURS_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onDailyHours(h)}
                aria-pressed={dailyHours === h}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  dailyHours === h
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background",
                )}
              >
                {h}h
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: be honest. Plans you can actually finish beat aspirational ones.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────

function Step3Card({
  exam,
  weakTopicIds,
  onToggle,
}: {
  exam: ExamWithTopics;
  weakTopicIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Where do you struggle most?</h2>
          <p className="text-sm text-muted-foreground">
            Pick a few topics. Your planner will spend extra time here.
          </p>
        </div>

        <div className="space-y-6">
          {exam.subjects.map((subject) => (
            <div key={subject.id} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {subject.name}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {subject.topics.map((topic) => {
                  const checked = weakTopicIds.has(topic.id);
                  return (
                    <label
                      key={topic.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors",
                        "hover:border-primary/50",
                        checked
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onToggle(topic.id)}
                        className="mt-0.5"
                      />
                      <span>{topic.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {weakTopicIds.size === 0
            ? "Skip if you'd rather start broad — you can flag weak topics anytime."
            : `${weakTopicIds.size} topic${weakTopicIds.size === 1 ? "" : "s"} selected`}
        </p>
      </CardContent>
    </Card>
  );
}
