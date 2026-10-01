export const STATUSES = [
  "new",
  "in_review",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  in_review: "In review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export const JOB_FAMILIES = [
  "Logistics",
  "Manufacturing",
  "Healthcare",
  "Office & Admin",
  "IT",
] as const;

export const COUNTRIES = [
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
] as const;

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

/** A job plus its applicant counts per status, as shown on the jobs page. */
export type JobWithCounts = Job & {
  application_count: number;
  new_count: number;
  in_review_count: number;
  shortlisted_count: number;
  rejected_count: number;
  hired_count: number;
};

/**
 * One application with its job and candidate. The list and the detail endpoint
 * return this same shape, so the UI renders one type everywhere.
 */
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
