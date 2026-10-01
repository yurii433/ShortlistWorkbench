import type { LlmScore } from "../../types.js";

export const LLM_SCORE_MIN = 0;
export const LLM_SCORE_MAX = 100;

/**
 * The single place a score is validated. Applied both to what the Anthropic
 * tool call returns and to whatever a MatchScorer hands back, so a scorer can
 * never get an out-of-range number into the database. Throws on bad input.
 */
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
