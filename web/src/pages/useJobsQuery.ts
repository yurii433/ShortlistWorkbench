import { useCallback } from "react";
import { fetchJobs } from "../api";
import { useListQuery } from "../useListQuery";
import { useUrlQuery } from "../useUrlQuery";

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

export function useJobsQuery() {
  const { query, setQuery } = useUrlQuery(DEFAULTS, PARAM_NAMES);

  const fetcher = useCallback(
    () => fetchJobs({ ...query, pageSize: PAGE_SIZE }),
    [query],
  );

  return { query, setQuery, ...useListQuery(fetcher, ERROR_MESSAGE) };
}
