import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type FieldSpec = Record<string, string | number | string[]>;

/**
 * Mirrors one page's filter state into the URL so a filtered list can be
 * reloaded or shared. `defaults` defines the fields and their fallback values;
 * `paramNames` maps each field to its query-string key.
 *
 * A list field is one repeated parameter per value (`?status=new&status=hired`),
 * which is what a checkbox group needs to survive a reload. Defaults and empty
 * strings are omitted from the URL to keep shared links short.
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
  const result: Record<string, string | number | string[]> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const name = paramNames[key as keyof T];
    if (!params.has(name)) continue;
    result[key] = Array.isArray(defaults[key as keyof T])
      ? params.getAll(name).filter((value) => value !== "")
      : typeof defaults[key as keyof T] === "number"
        ? positiveInt(params.get(name) as string)
        : (params.get(name) as string);
  }
  return result as T;
}

function toSearch<T extends FieldSpec>(
  query: T,
  defaults: T,
  paramNames: Record<keyof T, string>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaults)) {
    const value = query[key as keyof T];
    if (Array.isArray(value)) {
      for (const item of value) params.append(paramNames[key as keyof T], item);
    } else if (value !== defaults[key as keyof T] && value !== "") {
      params.set(paramNames[key as keyof T], String(value));
    }
  }
  return params;
}

function positiveInt(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}