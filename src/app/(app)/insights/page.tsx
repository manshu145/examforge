import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "PYQ + Current Affairs" };
export const dynamic = "force-dynamic";

export default function InsightsPage() {
  return (
    <ComingSoon
      title="PYQ + Current Affairs analyzer"
      description="Tables for previous-year questions and current affairs are seeded; the browse UX lands next."
      bullets={[
        "Filter PYQs by year, topic, and trend frequency",
        "Daily current-affairs feed tagged to exam syllabus",
        "AI-generated 'why this matters' notes per item",
        "Exportable to PDF for offline revision",
      ]}
    />
  );
}
