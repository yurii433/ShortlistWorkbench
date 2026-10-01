import Anthropic from "@anthropic-ai/sdk";
import type { Candidate, Job, LlmScore, MatchScorer } from "../../types.js";
import { LLM_SCORE_MAX, LLM_SCORE_MIN, parseLlmScore } from "./parse.js";

export const ANTHROPIC_MODEL = "claude-haiku-4-5";

/** Forces structured output: the model must answer through this tool. */
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
      tools: [SCORE_TOOL],
      tool_choice: { type: "tool", name: SCORE_TOOL.name },
    });

    const block = response.content.find((item) => item.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      throw new Error("LLM response had no structured score");
    }
    return parseLlmScore(block.input);
  }
}
