import type { Application, JobWithCounts, Status } from "./domain";

export type ListResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type JobListParams = {
  country: string[];
  jobFamily: string[];
  search: string[];
  sort: string;
  order: string;
  page: number;
  pageSize: number;
};

export type ApplicationListParams = {
  jobId: string;
  status: string[];
  source: string[];
  matchBand: string[];
  candidateCountry: string[];
  candidateCity: string[];
  preferredJobFamily: string[];
  /** Years of experience the candidate must have at least. */
  minExperience: number | undefined;
  sort: string;
  order: string;
  page: number;
  pageSize: number;
};

/**
 * Builds a query string. A list becomes one repeated parameter per value, so
 * several values inside one filter reach the API as `?status=a&status=b`.
 * Filters that are not set are skipped.
 */
function toQuery(
  params: Record<string, string | number | string[] | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== "") search.append(key, item);
      }
    } else if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  return search.toString();
}

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

export function fetchJobs(params: JobListParams): Promise<ListResponse<JobWithCounts>> {
  return fetch(`/jobs?${toQuery(params)}`).then((res) =>
    parseJson<ListResponse<JobWithCounts>>(res),
  );
}

export function fetchJob(id: string): Promise<JobWithCounts> {
  return fetch(`/jobs/${id}`).then((res) => parseJson<JobWithCounts>(res));
}

export function fetchApplications(
  params: ApplicationListParams,
): Promise<ListResponse<Application>> {
  return fetch(`/applications?${toQuery(params)}`).then((res) =>
    parseJson<ListResponse<Application>>(res),
  );
}

export function fetchApplication(id: string): Promise<Application> {
  return fetch(`/applications/${id}`).then((res) => parseJson<Application>(res));
}

export function patchStatus(
  id: string,
  status: Status,
  note?: string,
): Promise<Application> {
  return fetch(`/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  }).then((res) => parseJson<Application>(res));
}

export function requestLlmScore(id: string): Promise<Application> {
  return fetch(`/applications/${id}/llm-score`, { method: "POST" }).then((res) =>
    parseJson<Application>(res),
  );
}
