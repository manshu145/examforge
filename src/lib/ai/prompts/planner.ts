/**
 * Versioned prompt for the AI Study Planner.
 *
 * Versioning rule: bump PROMPT_VERSION whenever you materially change the
 * system message or the JSON contract. The version is stamped into
 * `study_plans.ai_metadata.prompt_version` so we can correlate plan quality
 * with prompt iterations.
 */

export const PROMPT_VERSION = "planner.v1";

export type TopicCatalogEntry = {
  id: string;
  name: string;
  /** Subject the topic belongs to, for grouping in the prompt. */
  subject: string;
  isWeak: boolean;
};

/**
 * Compact representation of the topic catalog for the model.
 * One line per topic; weak topics flagged with [WEAK].
 */
function formatCatalog(catalog: TopicCatalogEntry[]): string {
  const bySubject = new Map<string, TopicCatalogEntry[]>();
  for (const t of catalog) {
    if (!bySubject.has(t.subject)) bySubject.set(t.subject, []);
    bySubject.get(t.subject)!.push(t);
  }
  const lines: string[] = [];
  for (const [subject, topics] of bySubject) {
    lines.push(`# ${subject}`);
    for (const t of topics) {
      lines.push(`- ${t.id} :: ${t.name}${t.isWeak ? " [WEAK]" : ""}`);
    }
  }
  return lines.join("\n");
}

export function buildPlannerPrompt(input: {
  examName: string;
  examShortName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  dailyHours: number;
  catalog: TopicCatalogEntry[];
  notes?: string;
}): { system: string; user: string } {
  const catalog = formatCatalog(input.catalog);

  const system = `You are an expert exam-prep mentor for ${input.examName} aspirants in India. Your job is to design a focused, realistic, day-by-day study plan.

Hard rules:
- Output VALID JSON ONLY. No prose, no markdown, no commentary.
- Use ONLY topic ids from the supplied catalog (case-sensitive). Use null for general study/revision tasks (e.g. "Review notes").
- Tasks must fall within [${input.startDate}, ${input.endDate}].
- Plan for ~${input.dailyHours} hours per day. Sum of est_minutes per day should be between ${Math.max(input.dailyHours * 45, 60)} and ${input.dailyHours * 75} minutes.
- 1-3 tasks per day. Keep titles under 80 chars and descriptions under 280 chars.
- Weight WEAK topics 1.5-2x more than non-weak ones across the plan.
- Prioritise foundational topics in week 1; depth/practice in later weeks.
- Mix study, revision, and short practice tasks. End each week with a revision day.
- Keep weeks coherent (themed). Use short titles for weeks.

JSON shape:
{
  "title": "string (max 120 chars)",
  "weeks": [
    {
      "label": "string (e.g. 'Week 1: Foundations of Modern History')",
      "goals": ["string", "..."]
    }
  ],
  "tasks": [
    {
      "date": "YYYY-MM-DD",
      "title": "string",
      "description": "string (max 280 chars)",
      "topicId": "string | null (must be from catalog)",
      "estMinutes": 15..240,
      "position": 0..n (order within the day, starting at 0)
    }
  ]
}

Return JSON only.`;

  const userParts = [
    `Exam: ${input.examName} (${input.examShortName})`,
    `Plan window: ${input.startDate} -> ${input.endDate} (${input.totalDays} days)`,
    `Daily study capacity: ${input.dailyHours} hours`,
    `Topic catalog (use these ids only):\n${catalog}`,
  ];
  if (input.notes && input.notes.trim()) {
    userParts.push(`Aspirant note: ${input.notes.trim()}`);
  }
  userParts.push("Generate the plan now. JSON only.");

  return { system, user: userParts.join("\n\n") };
}
