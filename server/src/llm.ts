import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import type { Candidate, Job, LlmScore } from "./types.js";

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

export function parseLlmScore(payload: unknown): LlmScore {
  if (!payload || typeof payload !== "object") {
    throw new Error("LLM score is not an object");
  }
  const { score, reason } = payload as { score?: unknown; reason?: unknown };
  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < LLM_SCORE_MIN ||
    score > LLM_SCORE_MAX
  ) {
    throw new Error(`LLM score must be an integer ${LLM_SCORE_MIN}–${LLM_SCORE_MAX}`);
  }
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new Error("LLM reason is missing");
  }
  return { score, reason: reason.trim() };
}

const SCORE_TOOL: Anthropic.Tool = {
  name: "record_score",
  description: "Store the structured fit score",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "integer",
        minimum: LLM_SCORE_MIN,
        maximum: LLM_SCORE_MAX,
        description: `Fit score from ${LLM_SCORE_MIN} to ${LLM_SCORE_MAX}`,
      },
      reason: { type: "string", description: "One sentence" },
    },
    required: ["score", "reason"],
    additionalProperties: false,
  },
};

async function scoreWithMock(job: Job, candidate: Candidate): Promise<LlmScore> {
  const score = hashIds(job.job_id, candidate.candidate_id);
  return {
    score,
    reason: `Stub fit of ${score}/100 for ${candidate.full_name} on ${job.title} in ${job.city}.`,
  };
}

async function scoreWithAnthropic(job: Job, candidate: Candidate): Promise<LlmScore> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 512,
    system:
      "You score how well a candidate fits a job for a staffing agency. Be strict and concise.",
    messages: [
      {
        role: "user",
        content:
          `Job: ${job.title}, ${job.job_family}, ${job.seniority}, ${job.city} (${job.country}).\n` +
          `Candidate: ${candidate.years_experience} years experience, prefers ${candidate.preferred_job_family}, based in ${candidate.city} (${candidate.country}).\n` +
          "Score the fit as an integer 0–100 and one sentence.",
      },
    ],
    tools: [SCORE_TOOL],
    tool_choice: { type: "tool", name: SCORE_TOOL.name },
  });

  const block = response.content.find((item) => item.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("LLM response had no structured score");
  }
  return parseLlmScore(block.input);
}

export async function scoreWithLlm(job: Job, candidate: Candidate): Promise<LlmScore> {
  if (config.llmMode === "live") {
    if (!config.anthropicApiKey) {
      throw new Error("LLM_MODE=live requires ANTHROPIC_API_KEY");
    }
    return scoreWithAnthropic(job, candidate);
  }
  return scoreWithMock(job, candidate);
}

export const mockScorer = {
  model: "mock",
  async score(input: { job: Job; candidate: Candidate }): Promise<LlmScore> {
    return scoreWithMock(input.job, input.candidate);
  },
};