import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Mock tests" };
export const dynamic = "force-dynamic";

export default function MocksPage() {
  return (
    <ComingSoon
      title="Adaptive mock tests"
      description="The mock test engine is wired into the database. The UX surface ships in a follow-up release."
      bullets={[
        "Adaptive difficulty per topic based on rolling accuracy",
        "Mixed MCQ + descriptive papers for Mains-style exams",
        "Per-attempt analytics + AI feedback on descriptive answers",
        "PYQ-derived question banks for UPSC, NEET, JEE",
      ]}
    />
  );
}
