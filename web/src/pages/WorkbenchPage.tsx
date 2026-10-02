import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { fetchApplications, fetchJob } from "../api";
import type { Application, JobWithCounts } from "../domain";
import { ApplicationDetail } from "../components/applications/ApplicationDetail";
import { ApplicationFilters } from "../components/applications/ApplicationFilters";
import { ApplicationsList } from "../components/applications/ApplicationsList";
import { pageCountOf, rangeLabel } from "../format";
import { useListQuery } from "../hooks/useListQuery";
import { useUrlQuery } from "../hooks/useUrlQuery";

export type ApplicationsQueryState = {
  status: string;
  sort: string;
  order: string;
  page: number;
  /** The application open in the detail panel. */
  id: string;
};

const DEFAULTS: ApplicationsQueryState = {
  status: "",
  sort: "match_score",
  order: "desc",
  page: 1,
  id: "",
};

const PARAM_NAMES = {
  status: "status",
  sort: "sort",
  order: "order",
  page: "page",
  id: "id",
} satisfies Record<keyof ApplicationsQueryState, string>;

const PAGE_SIZE = 20;
const ERROR_MESSAGE = "Could not load applications. Is the API running?";

export function WorkbenchPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const { query, setQuery } = useUrlQuery(DEFAULTS, PARAM_NAMES);

  const fetcher = useCallback(
    () =>
      fetchApplications({
        jobId: jobId ?? "",
        status: query.status,
        sort: query.sort,
        order: query.order,
        page: query.page,
        pageSize: PAGE_SIZE,
      }),
    [jobId, query.status, query.sort, query.order, query.page],
  );
  const { items, total, loading, error, reload, setItems } = useListQuery(
    fetcher,
    ERROR_MESSAGE,
  );

  const [job, setJob] = useState<JobWithCounts | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const loadJob = useCallback(async (id: string) => {
    setJobError(null);
    try {
      setJob(await fetchJob(id));
    } catch {
      setJob(null);
      setJobError("Could not load this job.");
    }
  }, []);

  useEffect(() => {
    if (jobId) void loadJob(jobId);
    else setJob(null);
  }, [jobId, loadJob]);

  /** Patch the row behind the panel after a saved change in the detail. */
  const onRowChange = (updated: Application) => {
    setItems((current) =>
      current.map((item) =>
        item.application_id === updated.application_id
          ? { ...item, status: updated.status, llm_score: updated.llm_score }
          : item,
      ),
    );
  };

  if (!jobId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <button
              type="button"
              className="link-button"
              onClick={() => navigate("/")}
            >
              ← All jobs
            </button>
          </p>
          <h1>{job ? job.title : "Candidates"}</h1>
          <p className="muted">
            {job
              ? `${job.city}, ${job.country} · ${job.job_family} · ${job.seniority}`
              : jobId}
          </p>
        </div>
        <p className="muted">
          {rangeLabel(query.page, PAGE_SIZE, total, "applications")}
        </p>
      </header>

      {jobError ? <p className="error">{jobError}</p> : null}

      <ApplicationFilters query={query} onChange={setQuery} />

      <div className="workbench">
        <ApplicationsList
          state={{ items, loading, error, reload }}
          sort={query.sort}
          page={query.page}
          pageCount={pageCountOf(total, PAGE_SIZE)}
          onPage={(page) => setQuery({ page })}
          selectedId={query.id}
          onSelect={(id) => setQuery({ id })}
        />

        <ApplicationDetail
          applicationId={query.id}
          onRowChange={onRowChange}
          onStatusSaved={() => jobId && void loadJob(jobId)}
        />
      </div>
    </div>
  );
}
