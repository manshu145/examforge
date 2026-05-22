import { asc } from "drizzle-orm";

import { db } from "@/lib/db";
import { exams, subjects, topics } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { redirectIfOnboarded } from "@/server/actions/onboarding";
import { OnboardingWizard, type ExamWithTopics } from "@/components/onboarding/onboarding-wizard";

export const metadata = { title: "Set up your prep" };

/**
 * Server component: fetches the full exam catalog (exams -> subjects -> topics)
 * once and hands it to the client wizard. The wizard runs entirely in the
 * browser after that -- one round-trip on submit.
 *
 * If the catalog is empty (DB not seeded), we show a friendly "we're not ready"
 * fallback rather than a blank wizard.
 */
export default async function OnboardingPage() {
  // Auth required; redirect if already onboarded.
  const user = await requireUser();
  await redirectIfOnboarded();

  // One pass over each reference table; assemble in memory.
  const [allExams, allSubjects, allTopics] = await Promise.all([
    db.select().from(exams).orderBy(asc(exams.name)),
    db.select().from(subjects).orderBy(asc(subjects.position)),
    db.select().from(topics).orderBy(asc(topics.name)),
  ]);

  if (allExams.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          We&apos;re not quite ready yet
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Reference data hasn&apos;t been seeded for this environment. Run{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            npm run db:seed
          </code>{" "}
          and refresh.
        </p>
      </div>
    );
  }

  const examsWithTopics: ExamWithTopics[] = allExams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    shortName: exam.shortName,
    description: exam.description,
    subjects: allSubjects
      .filter((s) => s.examId === exam.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        topics: allTopics
          .filter((t) => t.subjectId === s.id)
          .map((t) => ({ id: t.id, name: t.name })),
      })),
  }));

  return <OnboardingWizard exams={examsWithTopics} initialFullName={user.fullName} />;
}
