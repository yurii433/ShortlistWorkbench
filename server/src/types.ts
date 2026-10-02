export const STATUSES = [
  "new",
  "in_review",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export type Status = (typeof STATUSES)[number];

export type Job = {
  job_id: string;
  title: string;
  job_family: string;
  seniority: string;
  country: string;
  city: string;
  created_at: string;
};

export type Candidate = {
  candidate_id: string;
  full_name: string;
  email: string;
  country: string;
  city: string;
  years_experience: number;
  preferred_job_family: string;
};

/**
 * The candidate fields an application carries. Deliberately a separate type from
 * `Candidate`: this is a read projection, not the entity, and the two are free
 * to diverge as the candidate record grows (CV, consent, notes). Keep it a
 * standalone declaration rather than a `Pick` so nothing re-ties them.
 */
export type ApplicationCandidate = {
  candidate_id: string;
  full_name: string;
  email: string;
  country: string;
  city: string;
  years_experience: number;
  preferred_job_family: string;
};

export type JobWithCounts = Job & {
  application_count: number;
  new_count: number;
  in_review_count: number;
  shortlisted_count: number;
  rejected_count: number;
  hired_count: number;
};

export type Application = {
  application_id: string;
  created_at: string;
  source: string;
  match_score: number;
  match_band: string;
  status: Status;
  status_updated_at: string | null;
  recruiter_note: string | null;
  llm_score: number | null;
  llm_reason: string | null;
  llm_scored_at: string | null;
  llm_model: string | null;
  /**
   * This candidate's other applications to the same job, excluding this one,
   * newest first. Empty when they applied once. Deliberately independent of any
   * active filter, so the signal survives sorting and paging.
   */
  sibling_application_ids: string[];
  job: Job;
  candidate: ApplicationCandidate;
};

export type LlmScore = {
  score: number;
  reason: string;
};

export type MatchScorer = {
  model: string;
  score(input: { job: Job; candidate: Candidate }): Promise<LlmScore>;
};

/** The envelope every list endpoint returns. */
export type ListResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}