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

export const MATCH_BANDS = ["low", "medium", "high"] as const;

export type MatchBand = (typeof MATCH_BANDS)[number];

export const MATCH_BAND_LABELS: Record<MatchBand, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const SOURCES = ["referral", "job_board", "career_site"] as const;

export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  referral: "Referral",
  job_board: "Job board",
  career_site: "Career site",
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

/** The cities the CSVs contain. Jobs and candidates share the same set. */
export const CITIES = [
  "Berlin",
  "Cologne",
  "Frankfurt",
  "Graz",
  "Hamburg",
  "Innsbruck",
  "Leipzig",
  "Linz",
  "Munich",
  "Salzburg",
  "Vienna",
] as const;

/**
 * Years-of-experience buckets. The value is the *minimum* years a bucket keeps,
 * so ticking several buckets is the same as ticking the lowest one.
 */
export const EXPERIENCE_BUCKETS = [
  { value: "0", label: "0–2 years" },
  { value: "3", label: "3–5 years" },
  { value: "6", label: "6–9 years" },
  { value: "10", label: "10+ years" },
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

/**
 * The candidate fields an application carries. Deliberately a separate type from
 * `Candidate`: this is a read projection, not the entity, and the two are free
 * to diverge as the candidate record grows (CV, consent, notes).
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
  match_band: MatchBand;
  status: Status;
  status_updated_at: string | null;
  recruiter_note: string | null;
  llm_score: number | null;
  llm_reason: string | null;
  llm_scored_at: string | null;
  llm_model: string | null;
  /**
   * This candidate's other applications to the same job, excluding this one,
   * newest first. Empty when they applied once, which is why the UI only shows a
   * count or a link when this is non-empty.
   */
  sibling_application_ids: string[];
  job: Job;
  candidate: ApplicationCandidate;
};
