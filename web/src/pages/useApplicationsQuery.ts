import { useCallback } from "react";
import { fetchApplications } from "../api";
import { useListQuery } from "../useListQuery";
import { useUrlQuery } from "../useUrlQuery";

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

export function useApplicationsQuery(jobId: string) {
  const { query, setQuery } = useUrlQuery(DEFAULTS, PARAM_NAMES);

  const fetcher = useCallback(
    () =>
      fetchApplications({
        jobId,
        status: query.status,
        sort: query.sort,
        order: query.order,
        page: query.page,
        pageSize: PAGE_SIZE,
      }),
    [jobId, query.status, query.sort, query.order, query.page],
  );

  return { query, setQuery, ...useListQuery(fetcher, ERROR_MESSAGE) };
}
