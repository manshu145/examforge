import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  introduction: "Introduction",
  body: "Body",
  conclusion: "Conclusion",
  structure: "Structure",
  factualAccuracy: "Factual accuracy",
  language: "Language",
};

/** Pure-CSS rubric bar chart. Accessible and fast; no chart library. */
export function RubricView({ rubric }: { rubric: Record<string, number> }) {
  return (
    <div className="space-y-3">
      {Object.entries(rubric).map(([key, value]) => {
        const label = LABELS[key] ?? key;
        const pct = Math.max(0, Math.min(10, value)) * 10;
        return (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="tabular-nums text-muted-foreground">
                {value.toFixed(1)} / 10
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={label}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={10}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700",
                  pct >= 70 ? "bg-success" : pct >= 40 ? "bg-primary" : "bg-warning",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
