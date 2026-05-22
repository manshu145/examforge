import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default function ProgressPage() {
  return (
    <ComingSoon
      title="Progress analytics"
      description="Real metrics arrive once you log mock attempts and evaluations. The dashboard already shows your active plan progress."
      bullets={[
        "Topic-level accuracy heatmap",
        "Time-on-task trends across weeks",
        "Plan completion rate vs. target year runway",
        "Strong vs. weak topic rebalancing suggestions",
      ]}
    />
  );
}
