export const STATUSES = [
  "new",
  "in_review",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export type Status = (typeof STATUSES)[number];

export const APPLICATION_SORT_FIELDS = [
  "match_score",
  "created_at",
  "score_disagreement",
] as const;

export const JOB_SORT_FIELDS = [
  "created_at",
  "title",
  "application_count",
] as const;

export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];
export type JobSortField = (typeof JOB_SORT_FIELDS)[number];

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
  match_band: string;
  status: Status;
  status_updated_at: string | null;
  recruiter_note: string | null;
  llm_score: number | null;
  llm_reason: string | null;
  llm_scored_at: string | null;
  llm_model: string | null;
  job: Job;
  candidate: Candidate;
};

export type LlmScore = {
  score: number;
  reason: string;
};

export type MatchScorer = {
  model: string;
  score(input: { job: Job; candidate: Candidate }): Promise<LlmScore>;
};

export type ListQuery = {
  status?: string;
  country?: string;
  jobFamily?: string;
  jobId?: string;
  search?: string;
  sort: ApplicationSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type JobListQuery = {
  country?: string;
  jobFamily?: string;
  search?: string;
  sort: JobSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
};

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}