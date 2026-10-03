import type { Candidate, Job } from "../../types.js";
import { LLM_SCORE_MAX, LLM_SCORE_MIN } from "./llm.service.js";

export const systemPrompt = `
You are a candidate-job matching evaluator. Compare the Candidate and Job data provided and calculate a match score from ${LLM_SCORE_MIN} to ${LLM_SCORE_MAX} with a short reason.

### Data Fields to Evaluate:
1. Preferred Job Family vs. Job Family (exact/similar match).
2. Years of Experience vs. Job Seniority (junior: 0–3 yrs, mid: 3–6 yrs, senior: 6+ yrs).
3. Location: Country and City alignment.

### Scoring Scale:
- 85–100: Strong match across job family, experience level, and location.
- 60–84: Partial match (e.g., matching job family/experience but different location).
- 0–59: Poor match (mismatched job family or major experience mismatch).

### Constraints:
- "reason" MUST be exactly one sentence summarizing the core decision.
`;

/**
 * Sent as `response_format`, so the provider guarantees the shape instead of us
 * hoping for it in prose. The task asks for structured JSON, not free text.
 */
export const MATCH_SCORE_JSON_SCHEMA = {
  type: "object",
  properties: {
    score: {
      type: "integer",
      minimum: LLM_SCORE_MIN,
      maximum: LLM_SCORE_MAX,
    },
    reason: { type: "string" },
  },
  required: ["score", "reason"],
  additionalProperties: false,
} as const;

export function buildUserContent(job: Job, candidate: Candidate): string {
  return `
### Job
Title: ${job.title}
Family: ${job.job_family}
Seniority: ${job.seniority}
Location: ${job.city}, ${job.country}

### Candidate
Preferred Family: ${candidate.preferred_job_family}
Years Experience: ${candidate.years_experience}
Location: ${candidate.city}, ${candidate.country}`;
}
