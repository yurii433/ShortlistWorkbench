import { useCallback, useMemo, useSyncExternalStore } from "react";

export type WorkbenchQuery = {
  status: string;
  country: string;
  jobFamily: string;
  sort: string;
  order: string;
  page: number;
  id: string;
};

const defaults: WorkbenchQuery = {
  status: "",
  country: "",
  jobFamily: "",
  sort: "match_score",
  order: "desc",
  page: 1,
  id: "",
};

let cachedSearch: string | null = null;
let cachedQuery: WorkbenchQuery | null = null;

function readQuery(): WorkbenchQuery {
  const search = window.location.search;
  if (cachedQuery && cachedSearch === search) {
    return cachedQuery;
  }
  const params = new URLSearchParams(search);
  const page = Number(params.get("page") ?? "1");
  const next: WorkbenchQuery = {
    status: params.get("status") ?? defaults.status,
    country: params.get("country") ?? defaults.country,
    jobFamily: params.get("jobFamily") ?? defaults.jobFamily,
    sort: params.get("sort") ?? defaults.sort,
    order: params.get("order") ?? defaults.order,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    id: params.get("id") ?? defaults.id,
  };
  cachedSearch = search;
  cachedQuery = next;
  return next;
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function toSearch(query: WorkbenchQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.country) params.set("country", query.country);
  if (query.jobFamily) params.set("jobFamily", query.jobFamily);
  if (query.sort !== defaults.sort) params.set("sort", query.sort);
  if (query.order !== defaults.order) params.set("order", query.order);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.id) params.set("id", query.id);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function useWorkbenchQuery() {
  const snapshot = useSyncExternalStore(subscribe, readQuery, readQuery);
  const query = useMemo(() => snapshot, [snapshot]);

  const setQuery = useCallback((patch: Partial<WorkbenchQuery>) => {
    const next = { ...readQuery(), ...patch };
    const search = toSearch(next);
    window.history.pushState({}, "", `${window.location.pathname}${search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return { query, setQuery };
}
