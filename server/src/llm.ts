import { OpenRouter } from "@openrouter/sdk";

import { config } from "./config.js";
import type { Candidate, Job, LlmScoreWithModel } from "./types.js";
import { systemPrompt } from "./modules/llm/prompt.js";

export const LLM_SCORE_MIN = 0;
export const LLM_SCORE_MAX = 100;

function hashIds(jobId: string, candidateId: string): number {
  const text = `${jobId}:${candidateId}`;
  let sum = 0;
  for (const char of text) {
    sum = (sum + char.charCodeAt(0) * 17) % 101;
  }
  return sum;
}

export function parseLlmScore(
  response: unknown,
): Pick<LlmScoreWithModel, "score" | "reason"> {
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
): Promise<LlmScoreWithModel> {
  const score = hashIds(job.job_id, candidate.candidate_id);
  return {
    score,
    reason: `Stub fit of ${score}/100 for ${candidate.full_name} on ${job.title} in ${job.city}.`,
    model: "mock",
  };
}

async function scoreWithLLM(userContent: any): Promise<LlmScoreWithModel> {
  const client = new OpenRouter({ apiKey: config.openRouterApiKey });

  const completion = await client.chat.send({
    chatRequest: {
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

  return {
    ...parseLlmScore(completion.choices[0].message.content),
    model: completion.model || "openrouter/auto",
  };
}

function buildUserContent(job: Job, candidate: Candidate): string {
  return `
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
}

export async function scoreCandidate(
  job: Job,
  candidate: Candidate,
): Promise<LlmScoreWithModel> {
  if (config.llmMode === "live") {
    if (!config.openRouterApiKey) {
      throw new Error("LLM_MODE=live requires API_KEY");
    }
    return scoreWithLLM(buildUserContent(job, candidate));
  }
  return scoreWithMock(job, candidate);
}
