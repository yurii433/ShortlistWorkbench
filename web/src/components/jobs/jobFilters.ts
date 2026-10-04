import { COUNTRIES, JOB_FAMILIES } from "../../utils/domain";
import type { FilterField, SortOption } from "../ui/filterTypes";

/**
 * The jobs list filters. Declared as a key tuple first so `satisfies` rejects a
 * missing or misspelled filter.
 */
export const JOB_FILTER_KEYS = ["search", "country", "jobFamily"] as const;

export type JobFilterKey = (typeof JOB_FILTER_KEYS)[number];

export type JobFilterFields = Record<JobFilterKey, FilterField>;

export const JOB_FILTERS = {
  search: {
    label: "Search",
    kind: "text",
    placeholder: "Title or city",
  },
  country: {
    label: "Country",
    kind: "select",
    options: COUNTRIES.map(({ code, name }) => ({ value: code, label: name })),
  },
  jobFamily: {
    label: "Job family",
    kind: "select",
    options: JOB_FAMILIES.map((family) => ({ value: family, label: family })),
  },
} satisfies JobFilterFields;

export const JOB_SORT_OPTIONS: readonly SortOption[] = [
  ["application_count:desc", "Most applicants"],
  ["application_count:asc", "Fewest applicants"],
  ["created_at:desc", "Newest first"],
  ["created_at:asc", "Oldest first"],
  ["title:asc", "Title (A → Z)"],
  ["title:desc", "Title (Z → A)"],
];

/** The URL parameter each filter state key is stored under; `search` is `q`. */
export const JOB_FILTER_PARAMS: Record<JobFilterKey, string> = {
  search: "q",
  country: "country",
  jobFamily: "jobFamily",
};

export const JOB_FILTER_DEFAULTS: Record<JobFilterKey, string[]> = {
  search: [],
  country: [],
  jobFamily: [],
};
