export const STATUSES = [
  "new",
  "in_review",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export type Status = (typeof STATUSES)[number];

export type ListItem = {
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
  job: {
    job_id: string;
    title: string;
    job_family: string;
    seniority: string;
    country: string;
    city: string;
  };
  candidate: {
    candidate_id: string;
    full_name: string;
  };
};

export type ApplicationDetail = ListItem & {
  llm_scored_at: string | null;
  llm_model: string | null;
  job: ListItem["job"] & { created_at?: string };
  candidate: ListItem["candidate"] & {
    email: string;
    country: string;
    city: string;
    years_experience: number;
    preferred_job_family: string;
  };
};

export type ListResponse = {
  items: ListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type JobListItem = {
  job_id: string;
  title: string;
  job_family: string;
  seniority: string;
  country: string;
  city: string;
  created_at: string;
  application_count: number;
  new_count: number;
  in_review_count: number;
  shortlisted_count: number;
  hired_count: number;
};

export type JobListResponse = {
  items: JobListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type JobListParams = {
  country: string;
  jobFamily: string;
  search: string;
  sort: string;
  order: string;
  page: number;
  pageSize: number;
};

export type ListParams = {
  status: string;
  country: string;
  jobFamily: string;
  jobId: string;
  sort: string;
  order: string;
  page: number;
  pageSize: number;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      typeof body.error === "string" ? body.error : `Request failed (${response.status})`,
    );
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export function fetchJobs(params: JobListParams): Promise<JobListResponse> {
  const query = new URLSearchParams();
  if (params.country) query.set("country", params.country);
  if (params.jobFamily) query.set("jobFamily", params.jobFamily);
  if (params.search) query.set("search", params.search);
  query.set("sort", params.sort);
  query.set("order", params.order);
  query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize));
  return fetch(`/jobs?${query}`).then((res) => parseJson<JobListResponse>(res));
}

export function fetchJob(id: string): Promise<JobListItem> {
  return fetch(`/jobs/${id}`).then((res) => parseJson<JobListItem>(res));
}

export function fetchApplications(params: ListParams): Promise<ListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.country) query.set("country", params.country);
  if (params.jobFamily) query.set("jobFamily", params.jobFamily);
  if (params.jobId) query.set("jobId", params.jobId);
  query.set("sort", params.sort);
  query.set("order", params.order);
  query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize));
  return fetch(`/applications?${query}`).then((res) => parseJson<ListResponse>(res));
}

export function fetchApplication(id: string): Promise<ApplicationDetail> {
  return fetch(`/applications/${id}`).then((res) => parseJson<ApplicationDetail>(res));
}

export function patchStatus(
  id: string,
  status: Status,
  note?: string,
): Promise<ApplicationDetail> {
  return fetch(`/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  }).then((res) => parseJson<ApplicationDetail>(res));
}

export function requestLlmScore(id: string): Promise<ApplicationDetail> {
  return fetch(`/applications/${id}/llm-score`, { method: "POST" }).then((res) =>
    parseJson<ApplicationDetail>(res),
  );
}
