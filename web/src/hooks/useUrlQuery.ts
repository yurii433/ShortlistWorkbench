import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type FieldSpec = Record<string, string | number>;

/**
 * Mirrors one page's filter state into the URL so a filtered list can be
 * reloaded or shared. `defaults` defines the fields and their fallback values;
 * `paramNames` maps each field to its query-string key.
 *
 * Defaults and empty strings are omitted from the URL to keep shared links short.
 */
export function useUrlQuery<T extends FieldSpec>(
  defaults: T,
  paramNames: Record<keyof T, string>,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(() => read(searchParams, defaults, paramNames), [searchParams]);

  const setQuery = useCallback(
    (patch: Partial<T>) => {
      setSearchParams(toSearch({ ...query, ...patch }, defaults, paramNames));
    },
    [query, defaults, paramNames, setSearchParams],
  );

  return { query, setQuery };
}

function read<T extends FieldSpec>(
  params: URLSearchParams,
  defaults: T,
  paramNames: Record<keyof T, string>,
): T {
  const result: Record<string, string | number> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const raw = params.get(paramNames[key as keyof T]);
    if (raw !== null) {
      result[key] =
        typeof defaults[key as keyof T] === "number" ? positiveInt(raw) : raw;
    }
  }
  return result as T;
}

function toSearch<T extends FieldSpec>(
  query: T,
  defaults: T,
  paramNames: Record<keyof T, string>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = query[key];
    if (value !== defaults[key] && value !== "") {
      params.set(paramNames[key], String(value));
    }
  }
  return params;
}

function positiveInt(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}
