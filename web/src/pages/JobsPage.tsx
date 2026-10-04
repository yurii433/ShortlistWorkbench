import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJobs } from "../api";
import {
  JOB_FILTER_DEFAULTS,
  JOB_FILTER_PARAMS,
  JOB_FILTERS,
  JOB_SORT_OPTIONS,
  type JobFilterKey,
} from "../components/jobs/jobFilters";
import { JobsList } from "../components/jobs/JobsList";
import { FilterBar } from "../components/ui/FilterBar";
import { pageCountOf, rangeLabel } from "../utils/format";
import { useListQuery } from "../hooks/useListQuery";
import { useUrlQuery } from "../hooks/useUrlQuery";

/** Filter values are lists, so both filter kinds share one state shape. */
type JobsQueryState = Record<JobFilterKey, string[]> & {
  sort: string;
  order: string;
  page: number;
};

const DEFAULTS: JobsQueryState = {
  ...JOB_FILTER_DEFAULTS,
  sort: "application_count",
  order: "desc",
  page: 1,
};

const PARAM_NAMES = {
  ...JOB_FILTER_PARAMS,
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
  const { items, total, loading, error, reload } = useListQuery(
    fetcher,
    ERROR_MESSAGE,
  );

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Better than a spreadsheet</p>
          <h1>Open jobs</h1>
        </div>
        <p className="muted">
          {rangeLabel(query.page, PAGE_SIZE, total, "jobs")}
        </p>
      </header>

      <FilterBar
        fields={JOB_FILTERS}
        state={query}
        onChange={(patch) => setQuery({ ...patch, page: 1 })}
        onClear={() => setQuery({ ...JOB_FILTER_DEFAULTS, page: 1 })}
        sort={query.sort}
        order={query.order}
        onSort={(sort, order) => setQuery({ sort, order, page: 1 })}
        sortOptions={JOB_SORT_OPTIONS}
      />

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
