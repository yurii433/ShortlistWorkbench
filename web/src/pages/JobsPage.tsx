import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJobs } from "../api";
import { JobFilters } from "../components/jobs/JobFilters";
import { JobsList } from "../components/jobs/JobsList";
import { pageCountOf, rangeLabel } from "../format";
import { useListQuery } from "../hooks/useListQuery";
import { useUrlQuery } from "../hooks/useUrlQuery";

export type JobsQueryState = {
  search: string;
  country: string;
  jobFamily: string;
  sort: string;
  order: string;
  page: number;
};

const DEFAULTS: JobsQueryState = {
  search: "",
  country: "",
  jobFamily: "",
  sort: "application_count",
  order: "desc",
  page: 1,
};

const PARAM_NAMES = {
  search: "q",
  country: "country",
  jobFamily: "jobFamily",
  sort: "jobSort",
  order: "jobOrder",
  page: "jobPage",
} satisfies Record<keyof JobsQueryState, string>;

const PAGE_SIZE = 20;
const ERROR_MESSAGE = "Could not load jobs. Is the API running?";

export function JobsPage() {
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQuery(DEFAULTS, PARAM_NAMES);

  const fetcher = useCallback(
    () => fetchJobs({ ...query, pageSize: PAGE_SIZE }),
    [query],
  );
  const { items, total, loading, error, reload } = useListQuery(fetcher, ERROR_MESSAGE);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Trenkwalder · internal</p>
          <h1>Open jobs</h1>
        </div>
        <p className="muted">{rangeLabel(query.page, PAGE_SIZE, total, "jobs")}</p>
      </header>

      <JobFilters query={query} onChange={setQuery} />

      <JobsList
        state={{ items, loading, error, reload }}
        page={query.page}
        pageCount={pageCountOf(total, PAGE_SIZE)}
        onPage={(page) => setQuery({ page })}
        onOpen={(jobId) => navigate(`/job/${jobId}`)}
      />
    </div>
  );
}
