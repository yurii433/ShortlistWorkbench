import { OpenRouter } from "@openrouter/sdk";

import { config } from "./config.js";
import type { Candidate, Job, LlmScore } from "./types.js";
import { systemPrompt } from "./modules/llm/prompt.js";

export const LLM_SCORE_MIN = 0;
export const LLM_SCORE_MAX = 100;
export const ANTHROPIC_MODEL = "claude-haiku-4-5";

function hashIds(jobId: string, candidateId: string): number {
  const text = `${jobId}:${candidateId}`;
  let sum = 0;
  for (const char of text) {
    sum = (sum + char.charCodeAt(0) * 17) % 101;
  }
  return sum;
}

export function parseLlmScore(response: unknown): LlmScore {
  let parsed = response;

  // 1. If response is a string, strip markdown fences and parse JSON
  if (typeof response === "string") {
    try {
      const cleanJson = response.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new Error("LLM response string could not be parsed as JSON");
    }
  }

  // 2. Ensure input is an object
  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM score is not an object");
  }

  const { score, reason } = parsed as { score?: unknown; reason?: unknown };

  // 3. Validate score field
  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < LLM_SCORE_MIN ||
    score > LLM_SCORE_MAX
  ) {
    throw new Error(
      `LLM score must be an integer ${LLM_SCORE_MIN}–${LLM_SCORE_MAX}`,
    );
  }

  // 4. Validate reason field (optional or required based on your type definition)
  if (typeof reason !== "string") {
    throw new Error("LLM score object missing string 'reason' field");
  }

  return { score, reason };
}

async function scoreWithMock(
  job: Job,
  candidate: Candidate,
): Promise<LlmScore> {
  const score = hashIds(job.job_id, candidate.candidate_id);
  return {
    score,
    reason: `Stub fit of ${score}/100 for ${candidate.full_name} on ${job.title} in ${job.city}.`,
  };
}

async function scoreWithLLM(userContent: any): Promise<LlmScore> {
  const client = new OpenRouter({ apiKey: config.openRouterApiKey });

  const completion = await client.chat.send({
    chatRequest: {
      // using free model for now, can switch to any model availiable on OpenRouter.
      model: "openrouter/auto",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    },
  });

  if (completion instanceof ReadableStream) {
    throw new Error("Expected a non-streaming response");
  }

  if (!completion.choices[0].message.content) {
    throw new Error("Non expected LLM response: no content to parse");
  }

  return parseLlmScore(completion.choices[0].message.content);
}

export async function scoreWithLlm(
  job: Job,
  candidate: Candidate,
): Promise<LlmScore> {
  const userContent = `
      ### Job
      ID: ${job.job_id}
      Title: ${job.title}
      Family: ${job.job_family}
      Seniority: ${job.seniority}
      Location: ${job.city}, ${job.country}

      ### Candidate
      ID: ${candidate.candidate_id}
      Preferred Family: ${candidate.preferred_job_family}
      Years Experience: ${candidate.years_experience}
      Location: ${candidate.city}, ${candidate.country}`;

  if (config.llmMode === "live") {
    if (!config.openRouterApiKey) {
      throw new Error("LLM_MODE=live requires API_KEY");
    }
    return scoreWithLLM(userContent);
  }
  return scoreWithMock(job, candidate);
}

export const mockScorer = {
  model: "mock",
  async score(input: { job: Job; candidate: Candidate }): Promise<LlmScore> {
    return scoreWithMock(input.job, input.candidate);
  },
};
