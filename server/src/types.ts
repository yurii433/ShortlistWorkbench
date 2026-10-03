export const STATUSES = [
  "new",
  "in_review",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export type Status = (typeof STATUSES)[number];

export const MATCH_BANDS = ["low", "medium", "high"] as const;

export type MatchBand = (typeof MATCH_BANDS)[number];

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
  match_band: MatchBand;
  status: Status;
  status_updated_at: string | null;
  recruiter_note: string | null;
  llm_score: number | null;
  llm_reason: string | null;
  llm_scored_at: string | null;
  llm_model: string | null;
  /**
   * if candidate has multiple applications for the same job, this will contain the ids of those applications. This is useful for the UI to show a warning that the candidate has multiple applications for the same job.
   */
  sibling_application_ids: string[];
  job: Job;
  candidate: Candidate;
};

export type LlmScore = {
  score: number;
  reason: string;
};

export type LlmScoreWithModel = {
  score: number;
  reason: string;
  model: string;
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

export function isMatchBand(value: string): value is MatchBand {
  return (MATCH_BANDS as readonly string[]).includes(value);
}
