import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  ClipboardCheck,
  LineChart,
  MessageSquareText,
  Newspaper,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EXAMS } from "@/lib/exams";

/**
 * Public landing page.
 *
 * Sections:
 *  1. Hero — value prop + primary CTAs
 *  2. Exams — what we cover
 *  3. Features — six product pillars
 *  4. Closing CTA
 */
export default function LandingPage() {
  return (
    <>
      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-fade absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="default"
              className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 text-xs"
            >
              <Sparkles className="size-3" />
              Built for India&apos;s toughest exams
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Your AI mentor for{" "}
              <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
                UPSC, NEET, JEE
              </span>{" "}
              & State PSCs
            </h1>
            <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
              Plan smarter, write sharper answers, and master mocks. ExamForge
              gives every aspirant a personal AI mentor that adapts to your
              exam, your weak areas, and your timeline.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/signup">
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · 1 study plan + 5 doubts/day on the free tier
            </p>
          </div>
        </div>
      </section>

      {/* ─── Exams ──────────────────────────────────────────── */}
      <section id="exams" className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Exams we cover
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Specialised, not generic
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every feature — from the planner to the evaluator — is tuned to
              the exam you&apos;re preparing for.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMS.map((exam) => (
              <Card
                key={exam.id}
                className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{exam.shortName}</span>
                    <Badge variant="outline" className="text-xs">
                      {exam.aspirantsPerYear}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {exam.name}
                  </p>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {exam.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────── */}
      <section id="features" className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Six pillars
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need, none of the noise
            </h2>
            <p className="mt-4 text-muted-foreground">
              Replace ten apps with one calm, focused workspace.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<CalendarDays className="size-5" />}
              title="Personalised study planner"
              description="Tell us your exam, target year, and weak areas. We generate a daily plan that fits your hours — and adapts as you progress."
            />
            <FeatureCard
              icon={<ClipboardCheck className="size-5" />}
              title="Descriptive answer evaluator"
              description="Submit a Mains-style answer; get a rubric-based score, model answer, and concrete suggestions for the next attempt."
            />
            <FeatureCard
              icon={<Brain className="size-5" />}
              title="Adaptive mock tests"
              description="Difficulty calibrates to your rolling accuracy per topic. No more grinding questions you've already mastered."
            />
            <FeatureCard
              icon={<MessageSquareText className="size-5" />}
              title="AI doubt solver"
              description="Stuck on a concept at midnight? Ask in plain English (or Hinglish). Get clear, exam-aware explanations in seconds."
            />
            <FeatureCard
              icon={<Newspaper className="size-5" />}
              title="PYQ + Current Affairs"
              description="See trends across previous years and why a current event matters — with the topics it could be tested on."
            />
            <FeatureCard
              icon={<LineChart className="size-5" />}
              title="Progress analytics"
              description="Topic-level heatmaps, accuracy trends, and time-on-task. Know exactly where to focus next week."
            />
          </div>
        </div>
      </section>

      {/* ─── Closing CTA ────────────────────────────────────── */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Stop guessing. Start preparing with feedback.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join thousands of aspirants who trade scattered prep for a focused,
            measurable routine.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="xl">
              <Link href="/signup">
                Create your free account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-6">
        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="mt-5 font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
