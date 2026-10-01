export const STATUSES = [
  "new",
  "in_review",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export type Status = (typeof STATUSES)[number];

export const SORT_FIELDS = [
  "match_score",
  "created_at",
  "score_disagreement",
] as const;

export type SortField = (typeof SORT_FIELDS)[number];

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
  sort: SortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
  hasLlmScore?: boolean;
};

export const JOB_SORT_FIELDS = ["created_at", "title", "application_count"] as const;

export type JobSortField = (typeof JOB_SORT_FIELDS)[number];

export type JobListQuery = {
  country?: string;
  jobFamily?: string;
  search?: string;
  sort: JobSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
};

export function isJobSortField(value: string): value is JobSortField {
  return (JOB_SORT_FIELDS as readonly string[]).includes(value);
}

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export function isSortField(value: string): value is SortField {
  return (SORT_FIELDS as readonly string[]).includes(value);
}
