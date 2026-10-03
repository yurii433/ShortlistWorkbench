import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type QueryValues = Record<string, string | number | string[]>;

/**
 * Syncs filter state between URL query params and component state.
 * 
 * @param defaults - Initial values for query fields
 * @param paramNames - Maps field names to their URL parameter keys
 * @returns { query, setQuery } - current query state and updater function
 * 
 * Example:
 * ```ts
 * const { query, setQuery } = useUrlQuery(
 *   { page: 1, status: [], search: "" },
 *   { page: "p", status: "s", search: "q" }
 * );
 * // URL: ?p=2&s=new&s=hired&q=test
 * // query = { page: 2, status: ["new", "hired"], search: "test" }
 * ```
 */
export function useUrlQuery<T extends QueryValues>(
  defaults: T,
  paramNames: Record<keyof T, string>,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    () => read(searchParams, defaults, paramNames),
    [searchParams, defaults, paramNames],
  );

  const setQuery = useCallback(
    (patch: Partial<T>) => {
      setSearchParams(toSearch({ ...query, ...patch }, defaults, paramNames));
    },
    [query, defaults, paramNames, setSearchParams],
  );

  return { query, setQuery };
}

function read<T extends QueryValues>(
  params: URLSearchParams,
  defaults: T,
  paramNames: Record<keyof T, string>,
): T {
  const result: Record<string, string | number | string[]> = { ...defaults };

  for (const fieldKey of Object.keys(defaults)) {
    const paramName = paramNames[fieldKey as keyof T];
    if (!params.has(paramName)) continue;

    const defaultValue = defaults[fieldKey as keyof T];

    if (Array.isArray(defaultValue)) {
      result[fieldKey] = params.getAll(paramName).filter((v) => v !== "");
    } else if (typeof defaultValue === "number") {
      result[fieldKey] = parsePositiveInt(params.get(paramName) as string);
    } else {
      result[fieldKey] = params.get(paramName) as string;
    }
  }

  return result as T;
}

function toSearch<T extends QueryValues>(
  query: T,
  defaults: T,
  paramNames: Record<keyof T, string>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const fieldKey of Object.keys(defaults)) {
    const value = query[fieldKey as keyof T];
    const paramName = paramNames[fieldKey as keyof T];

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(paramName, item));
    } else if (value !== defaults[fieldKey as keyof T] && value !== "") {
      params.set(paramName, String(value));
    }
  }

  return params;
}

function parsePositiveInt(value: string): number {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : 1;
}
