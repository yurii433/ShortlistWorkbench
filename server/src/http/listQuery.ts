export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type ParsedListQuery<SortField extends string> = {
  status?: string;
  country?: string;
  jobFamily?: string;
  jobId?: string;
  search?: string;
  sort: SortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type ListQueryResult<SortField extends string> =
  | { ok: true; value: ParsedListQuery<SortField> }
  | { ok: false; error: string };

/**
 * Reads and validates the paging/sorting/filtering every list endpoint shares.
 * Returns an error code instead of throwing, so a route can answer 400 directly.
 */
export function parseListQuery<SortField extends string>(
  query: Record<string, unknown>,
  sortFields: readonly SortField[],
  defaultSort: SortField,
): ListQueryResult<SortField> {
  const sort = optionalString(query.sort) ?? defaultSort;
  if (!sortFields.includes(sort as SortField)) {
    return { ok: false, error: "invalid_sort" };
  }

  const order = optionalString(query.order) ?? "desc";
  if (order !== "asc" && order !== "desc") {
    return { ok: false, error: "invalid_order" };
  }

  const page = integerParam(query.page, 1);
  if (page === undefined) {
    return { ok: false, error: "invalid_page" };
  }

  const pageSize = integerParam(query.pageSize, DEFAULT_PAGE_SIZE);
  if (pageSize === undefined) {
    return { ok: false, error: "invalid_page_size" };
  }

  return {
    ok: true,
    value: {
      status: optionalString(query.status),
      country: optionalString(query.country),
      jobFamily: optionalString(query.jobFamily),
      jobId: optionalString(query.jobId),
      search: optionalString(query.search),
      sort: sort as SortField,
      order,
      page,
      pageSize: Math.min(pageSize, MAX_PAGE_SIZE),
    },
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function integerParam(value: unknown, fallback: number): number | undefined {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
}
