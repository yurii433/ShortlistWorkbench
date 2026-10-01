import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type WorkbenchQuery = {
  jobCountry: string;
  jobFamily: string;
  jobSearch: string;
  jobSort: string;
  jobOrder: string;
  jobPage: number;
  status: string;
  country: string;
  sort: string;
  order: string;
  page: number;
  id: string;
};

const defaults: WorkbenchQuery = {
  jobCountry: "",
  jobFamily: "",
  jobSearch: "",
  jobSort: "application_count",
  jobOrder: "desc",
  jobPage: 1,
  status: "",
  country: "",
  sort: "match_score",
  order: "desc",
  page: 1,
  id: "",
};

function positiveInt(value: string | null): number {
  const parsed = Number(value ?? "1");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function read(params: URLSearchParams): WorkbenchQuery {
  return {
    jobCountry: params.get("jobCountry") ?? defaults.jobCountry,
    jobFamily: params.get("jobFamily") ?? defaults.jobFamily,
    jobSearch: params.get("q") ?? defaults.jobSearch,
    jobSort: params.get("jobSort") ?? defaults.jobSort,
    jobOrder: params.get("jobOrder") ?? defaults.jobOrder,
    jobPage: positiveInt(params.get("jobPage")),
    status: params.get("status") ?? defaults.status,
    country: params.get("country") ?? defaults.country,
    sort: params.get("sort") ?? defaults.sort,
    order: params.get("order") ?? defaults.order,
    page: positiveInt(params.get("page")),
    id: params.get("id") ?? defaults.id,
  };
}

function toSearch(query: WorkbenchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.jobCountry) params.set("jobCountry", query.jobCountry);
  if (query.jobFamily) params.set("jobFamily", query.jobFamily);
  if (query.jobSearch) params.set("q", query.jobSearch);
  if (query.jobSort !== defaults.jobSort) params.set("jobSort", query.jobSort);
  if (query.jobOrder !== defaults.jobOrder) params.set("jobOrder", query.jobOrder);
  if (query.jobPage !== 1) params.set("jobPage", String(query.jobPage));
  if (query.status) params.set("status", query.status);
  if (query.country) params.set("country", query.country);
  if (query.sort !== defaults.sort) params.set("sort", query.sort);
  if (query.order !== defaults.order) params.set("order", query.order);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.id) params.set("id", query.id);
  return params;
}

export function useWorkbenchQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => read(searchParams), [searchParams]);

  const setQuery = useCallback(
    (patch: Partial<WorkbenchQuery>) => {
      setSearchParams(toSearch({ ...query, ...patch }));
    },
    [query, setSearchParams],
  );

  return { query, setQuery };
}