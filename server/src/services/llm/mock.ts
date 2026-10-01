import type { Candidate, Job, LlmScore, MatchScorer } from "../../types.js";

function hashIds(jobId: string, candidateId: string): number {
  const text = `${jobId}:${candidateId}`;
  let sum = 0;
  for (const char of text) {
    sum = (sum + char.charCodeAt(0) * 17) % 101;
  }
  return sum;
}

export class MockMatchScorer implements MatchScorer {
  readonly model = "mock";

  async score(input: { job: Job; candidate: Candidate }): Promise<LlmScore> {
    const score = hashIds(input.job.job_id, input.candidate.candidate_id);
    return {
      score,
      reason: `Stub fit of ${score}/100 for ${input.candidate.full_name} on ${input.job.title} in ${input.job.city}.`,
    };
  }
}
