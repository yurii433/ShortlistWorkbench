import type { SortOrder } from "../../http/list-query.js";

export const JOB_SORT_FIELDS = [
  "created_at",
  "title",
  "application_count",
] as const;

export type JobSortField = (typeof JOB_SORT_FIELDS)[number];

/** The job list use case, after the query string has been validated. */
export type JobListQuery = {
  country?: string;
  jobFamily?: string;
  search?: string;
  sort: JobSortField;
  order: SortOrder;
  page: number;
  pageSize: number;
};