export const metadata = { title: "About" };

/**
 * About page. Lightweight for now — expand with team/story content later.
 */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-tight">About ExamForge</h1>
      <div className="mt-8 space-y-5 text-pretty leading-relaxed text-muted-foreground">
        <p>
          ExamForge exists because preparing for India&apos;s competitive exams is
          unfair. The syllabi are vast, the materials are scattered, and quality
          mentorship is gated by geography and price.
        </p>
        <p>
          We believe an AI mentor — exam-aware, patient, and available at 2 AM —
          can level that field. Not by replacing teachers, but by making the
          loop between practice and feedback fast enough to actually learn from.
        </p>
        <p>
          Every feature here is built around a single question: does this make a
          serious aspirant better prepared by next month?
        </p>
      </div>
    </div>
  );
}
