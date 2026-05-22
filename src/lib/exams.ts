/**
 * Static metadata for the exams ExamForge supports.
 *
 * Used by the marketing landing page, onboarding, and any feature that needs
 * to display exam-aware copy without a DB round-trip. The `exams` table in
 * Supabase mirrors this list (id is the foreign key everywhere).
 */

export type ExamId = "upsc" | "neet" | "jee" | "state_psc";

export type Exam = {
  id: ExamId;
  name: string;
  shortName: string;
  description: string;
  /** Approximate aspirants per year (for marketing copy only). */
  aspirantsPerYear: string;
  /** Color hint used by the UI (Tailwind class name, not a token). */
  accent: "indigo" | "emerald" | "amber" | "rose";
};

export const EXAMS: Exam[] = [
  {
    id: "upsc",
    name: "UPSC Civil Services",
    shortName: "UPSC",
    description:
      "Prelims, Mains, and Interview prep with descriptive answer evaluation.",
    aspirantsPerYear: "10L+",
    accent: "indigo",
  },
  {
    id: "neet",
    name: "NEET-UG",
    shortName: "NEET",
    description:
      "Adaptive Biology, Physics, and Chemistry mocks tuned to NEET difficulty.",
    aspirantsPerYear: "20L+",
    accent: "emerald",
  },
  {
    id: "jee",
    name: "JEE Main + Advanced",
    shortName: "JEE",
    description:
      "Concept drills and PYQ trends for Physics, Chemistry, Mathematics.",
    aspirantsPerYear: "12L+",
    accent: "amber",
  },
  {
    id: "state_psc",
    name: "State PSCs",
    shortName: "State PSC",
    description:
      "BPSC, MPSC, UPPSC, and more — state-specific syllabus and current affairs.",
    aspirantsPerYear: "8L+",
    accent: "rose",
  },
];

export function getExam(id: ExamId): Exam {
  const exam = EXAMS.find((e) => e.id === id);
  if (!exam) throw new Error(`Unknown exam id: ${id}`);
  return exam;
}
