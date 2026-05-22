/**
 * Versioned prompt for the Descriptive Answer Evaluator.
 * Tuned for UPSC Mains-style answers; rubric generalises to any structured
 * written response.
 */

export const PROMPT_VERSION = "evaluator.v1";

export function buildEvaluatorPrompt(input: {
  examName: string;
  question: string;
  answer: string;
  topicName?: string | null;
}): { system: string; user: string } {
  const system = `You are a senior ${input.examName} examiner. Evaluate the candidate's descriptive answer with the rigour of an actual mains-style review.

Rubric (each scored 0-10):
- introduction: clarity, hook, framing of the question
- body: argument quality, evidence, logical flow
- conclusion: synthesis and forward-looking note
- structure: paragraphing, transitions, balance
- factualAccuracy: correctness of facts, dates, names, theory
- language: clarity, grammar, exam-appropriate register

Hard rules:
- Output VALID JSON ONLY. No prose, no markdown.
- Be specific in improvementNotes: name *what* to fix.
- modelAnswer: rewrite at examiner-quality (200-350 words).
- score: a single 0-10 aggregate (not necessarily the mean).

JSON shape:
{
  "rubric": {
    "introduction": 0-10, "body": 0-10, "conclusion": 0-10,
    "structure": 0-10, "factualAccuracy": 0-10, "language": 0-10
  },
  "score": 0-10,
  "modelAnswer": "string",
  "improvementNotes": "string"
}

Return JSON only.`;

  const userParts = [
    `Exam: ${input.examName}`,
    input.topicName ? `Topic: ${input.topicName}` : null,
    `Question:\n${input.question}`,
    `Candidate's answer:\n${input.answer}`,
    `Word count: ${input.answer.trim().split(/\s+/).filter(Boolean).length}`,
    `Evaluate now. JSON only.`,
  ].filter(Boolean) as string[];

  return { system, user: userParts.join("\n\n") };
}
