import { config } from "../../config.js";
import type { Candidate, Job, LlmScoreWithModel } from "../../types.js";
export const LLM_SCORE_MIN = 0;
export const LLM_SCORE_MAX = 100;

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

export async function scoreWithMock(
  job: Job,
  candidate: Candidate,
): Promise<LlmScoreWithModel> {
  const score = Math.random() * (LLM_SCORE_MAX - LLM_SCORE_MIN) + LLM_SCORE_MIN;
  return {
    score,
    reason: `Stub fit of ${score}/100 for ${candidate.full_name} on ${job.title} in ${job.city}.`,
    model: "mock",
  };
}

export function buildUserContent(job: Job, candidate: Candidate): string {
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
