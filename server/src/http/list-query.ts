import { BadRequestError } from "../errors.js";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type SortOrder = "asc" | "desc";

/** Paging and direction shared by every list endpoint. */
export type PageQuery = {
  order: SortOrder;
  page: number;
  pageSize: number;
};

/** A query-string value, or undefined when it is missing or blank. */
export function readText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/**
 * Resolves a sort key against an allowlist. The repository maps the same keys to
 * SQL, so this is where user input stops being able to name a column.
 */
export function readSort<Field extends string>(
  value: unknown,
  fields: readonly Field[],
  fallback: Field,
): Field {
  const sort = readText(value);
  if (sort === undefined) return fallback;
  if (!(fields as readonly string[]).includes(sort)) {
    throw new BadRequestError("invalid_sort");
  }
  return sort as Field;
}

export function readOrder(value: unknown): SortOrder {
  const order = readText(value);
  if (order === undefined) return "desc";
  if (order !== "asc" && order !== "desc") {
    throw new BadRequestError("invalid_order");
  }
  return order;
}

export function readPage(value: unknown): number {
  if (value === undefined) return 1;
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) {
    throw new BadRequestError("invalid_page");
  }
  return page;
}

export function readPageSize(value: unknown): number {
  if (value === undefined) return DEFAULT_PAGE_SIZE;
  const pageSize = Number(value);
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new BadRequestError("invalid_page_size");
  }
  return Math.min(pageSize, MAX_PAGE_SIZE);
}

export function readPaging(query: Record<string, unknown>): PageQuery {
  return {
    order: readOrder(query.order),
    page: readPage(query.page),
    pageSize: readPageSize(query.pageSize),
  };
}

export function pageOffset({ page, pageSize }: PageQuery): number {
  return (page - 1) * pageSize;
}

/** `"ASC" | "DESC"`, safe to interpolate because it is never user text. */
export function sqlDirection(order: SortOrder): "ASC" | "DESC" {
  return order === "asc" ? "ASC" : "DESC";
}