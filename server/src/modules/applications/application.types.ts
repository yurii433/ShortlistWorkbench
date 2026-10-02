import type { SortOrder } from "../../http/list-query.js";

export const APPLICATION_SORT_FIELDS = [
  "match_score",
  "created_at",
  "score_disagreement",
] as const;

export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];

/**
 * The application list use case, after the query string has been validated.
 *
 * Every filter is a list because the UI is a checkbox group: values inside one
 * group are combined with `IN`, groups are combined with `AND`, and an empty
 * list means the group is not filtering at all. `minExperience` is a threshold
 * rather than a list, so that several experience buckets collapse to one
 * comparison.
 */
export type ApplicationListQuery = {
  status?: string[];
  source?: string[];
  matchBand?: string[];
  candidateCountry?: string[];
  candidateCity?: string[];
  preferredJobFamily?: string[];
  minExperience?: number;
  /** Filters the job, kept for callers outside the per-job workbench page. */
  country?: string[];
  jobFamily?: string[];
  jobId?: string[];
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