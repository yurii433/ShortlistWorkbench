import type { SortOrder } from "../../http/list-query.js";

export const APPLICATION_SORT_FIELDS = [
  "match_score",
  "created_at",
  "score_disagreement",
] as const;

export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];

/** The application list use case, after the query string has been validated. */
export type ApplicationListQuery = {
  status?: string;
  country?: string;
  jobFamily?: string;
  jobId?: string;
  search?: string;
  sort: ApplicationSortField;
  order: SortOrder;
  page: number;
  pageSize: number;
};

/** The PATCH body. `status` is required, `note` is not. */
export type UpdateApplicationInput = {
  status: string;
  note?: string;
};