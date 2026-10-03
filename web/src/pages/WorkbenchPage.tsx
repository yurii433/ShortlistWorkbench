import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchApplications, fetchJob } from "../api";
import {
  APPLICATION_FILTER_DEFAULTS,
  APPLICATION_FILTER_PARAMS,
  APPLICATION_FILTERS,
  minExperienceOf,
  type ApplicationFilterKey,
} from "../applicationFilters";
import type { Application, JobWithCounts } from "../domain";
import { ApplicationDetail } from "../components/applications/ApplicationDetail";
import { ApplicationsList } from "../components/applications/ApplicationsList";
import { FilterBar } from "../components/ui/FilterBar";
import { pageCountOf, rangeLabel } from "../format";
import { useListQuery } from "../hooks/useListQuery";
import { useUrlQuery } from "../hooks/useUrlQuery";

/**
 * One filter list per field, so several ticks inside a group survive a reload
 * and reach the API as repeated query parameters.
 */
type ApplicationsQueryState = Record<ApplicationFilterKey, string[]> & {
  sort: string;
  order: string;
  page: number;
  /** The application open in the detail panel. */
  id: string;
};

const DEFAULTS: ApplicationsQueryState = {
  ...APPLICATION_FILTER_DEFAULTS,
  sort: "match_score",
  order: "desc",
  page: 1,
  id: "",
};

const PARAM_NAMES = {
  ...APPLICATION_FILTER_PARAMS,
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
  const [searchParams, setSearchParams] = useSearchParams();

  const { query, setQuery } = useUrlQuery(DEFAULTS, PARAM_NAMES);

  const closeApplication = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(PARAM_NAMES.id);
    setSearchParams(nextParams);
  };

  const {
    page,
    sort,
    order,
    status,
    source,
    matchBand,
    candidateCountry,
    candidateCity,
    experience,
    preferredJobFamily,
  } = query;

  /**
   * `useUrlQuery` builds a fresh array for every list field on each URL change,
   * so their identity says nothing about whether the request changed. Depending
   * on the arrays would refetch the whole list every time a row is opened, so
   * the request is keyed on their values instead.
   */
  const filterKey = JSON.stringify([
    status,
    source,
    matchBand,
    candidateCountry,
    candidateCity,
    experience,
    preferredJobFamily,
  ]);

  const fetcher = useCallback(
    () =>
      fetchApplications({
        jobId: jobId ?? "",
        minExperience: minExperienceOf(experience),
        pageSize: PAGE_SIZE,
        sort,
        order,
        page,
        status,
        source,
        matchBand,
        candidateCountry,
        candidateCity,
        preferredJobFamily,
      }),
    [jobId, page, sort, order, filterKey],
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

      <div className={`workbench${query.id ? " workbench--selected" : ""}`}>
        <aside className="sidebar">
          <FilterBar
            fields={APPLICATION_FILTERS}
            state={query}
            onChange={(patch) => setQuery({ ...patch, page: 1 })}
            onClear={() => setQuery({ ...APPLICATION_FILTER_DEFAULTS, page: 1 })}
          />
        </aside>
        <ApplicationsList
          state={{ items, loading, error, reload }}
          sort={query.sort}
          order={query.order}
          onSort={(sort, order) => setQuery({ sort, order, page: 1 })}
          page={query.page}
          pageCount={pageCountOf(total, PAGE_SIZE)}
          onPage={(page) => setQuery({ page })}
          selectedId={query.id}
          onSelect={(id) => setQuery({ id })}
        />

        {query.id ? (
          <ApplicationDetail
            applicationId={query.id}
            onRowChange={onRowChange}
            onClose={closeApplication}
          />
        ) : null}
      </div>
    </div>
  );
}
