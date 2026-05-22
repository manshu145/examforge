/**
 * Single entry point for AI calls.
 *
 * Both Groq and OpenAI expose an OpenAI-compatible /chat/completions endpoint,
 * so we hit them with raw fetch (no SDK dependency). The thin abstraction lets
 * us:
 *   1. Route by feature (planner/doubt -> Groq for speed, evaluator -> OpenAI
 *      for rubric reasoning) without the call-site knowing or caring.
 *   2. Validate AI output with Zod and retry on malformed JSON.
 *   3. Surface clean error states ({ ok: false, error }) so server actions
 *      can toast without try/catch boilerplate.
 *   4. Return token usage so we can log it into `usage_events`.
 */

import { type ZodSchema } from "zod";

import { env } from "@/lib/env";

export type AIProvider = "openai" | "groq";

const ENDPOINTS: Record<AIProvider, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
};

/**
 * Default model per feature. Tweak in one place.
 *
 * Groq's llama-3.3-70b is the right call for chat / planning: fast, cheap,
 * strong instruction-following and JSON-mode support. OpenAI's gpt-4o-mini
 * wins on rubric-style reasoning needed for descriptive answer evaluation.
 */
export const AI_MODELS = {
  planner: { provider: "groq" as const, model: "llama-3.3-70b-versatile" },
  doubt: { provider: "groq" as const, model: "llama-3.3-70b-versatile" },
  evaluator: { provider: "openai" as const, model: "gpt-4o-mini" },
} satisfies Record<string, { provider: AIProvider; model: string }>;

export type AIUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: AIProvider;
  latencyMs: number;
};

export type AIResult<T> =
  | { ok: true; data: T; usage: AIUsage }
  | { ok: false; error: string };

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices: { message: { content: string | null } }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

function getApiKey(provider: AIProvider): string {
  const key = provider === "groq" ? env.GROQ_API_KEY : env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      `Missing ${provider === "groq" ? "GROQ_API_KEY" : "OPENAI_API_KEY"}. ` +
        `Add it to .env.local (see .env.example).`,
    );
  }
  return key;
}

/**
 * Low-level chat completion. Use `generateJSON` for structured output.
 */
export async function chatCompletion(opts: {
  provider: AIProvider;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<AIResult<{ content: string }>> {
  const apiKey = getApiKey(opts.provider);
  const started = Date.now();

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4096,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  let response: Response;
  try {
    response = await fetch(ENDPOINTS[opts.provider], {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      error: `Network error reaching ${opts.provider}: ${(err as Error).message}`,
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      ok: false,
      error: `${opts.provider} returned ${response.status}: ${text.slice(0, 240)}`,
    };
  }

  const json = (await response.json()) as ChatCompletionResponse;
  const content = json.choices[0]?.message.content ?? "";
  if (!content) {
    return { ok: false, error: `${opts.provider} returned an empty response` };
  }

  return {
    ok: true,
    data: { content },
    usage: {
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
      totalTokens: json.usage?.total_tokens ?? 0,
      model: opts.model,
      provider: opts.provider,
      latencyMs: Date.now() - started,
    },
  };
}

/**
 * Generate JSON output validated against a Zod schema.
 *
 * Retries once on parse / validation failure with a stricter "you must return
 * valid JSON" reminder. If both attempts fail, returns a structured error.
 */
export async function generateJSON<T>(opts: {
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodSchema<T>;
  temperature?: number;
  maxTokens?: number;
}): Promise<AIResult<T>> {
  const messages: ChatMessage[] = [
    { role: "system", content: opts.systemPrompt },
    { role: "user", content: opts.userPrompt },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await chatCompletion({
      provider: opts.provider,
      model: opts.model,
      messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      jsonMode: true,
    });
    if (!completion.ok) return completion;

    let parsed: unknown;
    try {
      parsed = JSON.parse(completion.data.content);
    } catch {
      messages.push(
        { role: "assistant", content: completion.data.content },
        {
          role: "user",
          content:
            "Your previous response was not valid JSON. Reply with ONLY the JSON object, no prose.",
        },
      );
      continue;
    }

    const validated = opts.schema.safeParse(parsed);
    if (validated.success) {
      return { ok: true, data: validated.data, usage: completion.usage };
    }

    messages.push(
      { role: "assistant", content: completion.data.content },
      {
        role: "user",
        content:
          "The JSON did not match the required schema. Issues:\n" +
          validated.error.issues
            .slice(0, 6)
            .map((i) => `- ${i.path.join(".")}: ${i.message}`)
            .join("\n") +
          "\n\nReturn a corrected JSON object only.",
      },
    );
  }

  return {
    ok: false,
    error: "AI returned malformed output after 2 attempts. Try again in a moment.",
  };
}
