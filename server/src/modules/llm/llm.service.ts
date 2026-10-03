import type { Candidate, Job, LlmScoreWithModel } from "../../types.js";

export const LLM_SCORE_MIN = 0;
export const LLM_SCORE_MAX = 100;

/**
 * Defence in depth behind `response_format: json_schema`: a provider can still
 * answer with a fenced code block or an out-of-range number, and the API must
 * never store a score it did not check.
 */
export function parseLlmScore(
  response: unknown,
): Pick<LlmScoreWithModel, "score" | "reason"> {
  let parsed = response;

  if (typeof response === "string") {
    try {
      const cleanJson = response.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      throw new Error("LLM response string could not be parsed as JSON");
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM score is not an object");
  }

  const { score, reason } = parsed as { score?: unknown; reason?: unknown };

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

  if (typeof reason !== "string" || reason.trim() === "") {
    throw new Error("LLM score object missing non-empty string 'reason' field");
  }

  return { score, reason: reason.trim() };
}

/**
 * Generates a deterministic mock score for a job-candidate pair when no API key is set.
 */
function stubScoreFor(jobId: string, candidateId: string): number {
  const str = `${jobId}:${candidateId}`;
  const hash = str
    .split("")
    .reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
  const range = LLM_SCORE_MAX - LLM_SCORE_MIN + 1;

  return LLM_SCORE_MIN + (Math.abs(hash) % range);
}

export async function scoreWithMock(
  job: Job,
  candidate: Candidate,
): Promise<LlmScoreWithModel> {
  const score = stubScoreFor(job.job_id, candidate.candidate_id);
  return {
    score,
    reason: `Mock evaluation: ${score}/${LLM_SCORE_MAX} for ${candidate.full_name} on ${job.title} in ${job.city}.`,
    model: "mock",
  };
}
