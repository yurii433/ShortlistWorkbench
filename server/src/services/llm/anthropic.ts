import Anthropic from "@anthropic-ai/sdk";
import type { Candidate, Job, LlmScore, MatchScorer } from "../../types.js";

export const ANTHROPIC_MODEL = "claude-haiku-4-5";

export function parseScore(payload: unknown): LlmScore {
  if (!payload || typeof payload !== "object") {
    throw new Error("LLM returned non-object JSON");
  }
  const data = payload as { score?: unknown; reason?: unknown };
  const score = data.score;
  const reason = data.reason;
  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 100
  ) {
    throw new Error("LLM score is not an integer 0–100");
  }
  if (typeof reason !== "string" || reason.trim() === "") {
    throw new Error("LLM reason is missing");
  }
  return { score, reason: reason.trim() };
}

export class AnthropicMatchScorer implements MatchScorer {
  readonly model = ANTHROPIC_MODEL;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async score(input: { job: Job; candidate: Candidate }): Promise<LlmScore> {
    const response = await this.client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system:
        "You score how well a candidate fits a job for a staffing agency. Be strict and concise.",
      messages: [
        {
          role: "user",
          content:
            `Job: ${input.job.title}, ${input.job.job_family}, ${input.job.seniority}, ${input.job.city} (${input.job.country}).\n` +
            `Candidate: ${input.candidate.years_experience} years experience, prefers ${input.candidate.preferred_job_family}, based in ${input.candidate.city} (${input.candidate.country}).\n` +
            "Score the fit as an integer 0–100 and one sentence.",
        },
      ],
      tools: [
        {
          name: "record_score",
          description: "Store the structured fit score",
          input_schema: {
            type: "object",
            properties: {
              score: {
                type: "integer",
                minimum: 0,
                maximum: 100,
                description: "Fit score from 0 to 100",
              },
              reason: { type: "string", description: "One sentence" },
            },
            required: ["score", "reason"],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_score" },
    });

    const block = response.content.find((item) => item.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      throw new Error("LLM response had no structured score");
    }
    return parseScore(block.input);
  }
}
