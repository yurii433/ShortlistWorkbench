import {
  CITIES,
  COUNTRIES,
  EXPERIENCE_BUCKETS,
  JOB_FAMILIES,
  MATCH_BANDS,
  MATCH_BAND_LABELS,
  SOURCES,
  SOURCE_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "../../utils/domain";
import type { FilterField, SortOption } from "../ui/filterTypes";

/**
 * The candidate filters of the workbench page. Declared as a key tuple first so
 * that `satisfies` below rejects a missing or misspelled filter, and so the key
 * union stays exact.
 */
export const APPLICATION_FILTER_KEYS = [
  "status",
  "source",
  "matchBand",
  "candidateCountry",
  "candidateCity",
  "experience",
  "preferredJobFamily",
] as const;

export type ApplicationFilterKey = (typeof APPLICATION_FILTER_KEYS)[number];

export type ApplicationFilterFields = Record<ApplicationFilterKey, FilterField>;

export const APPLICATION_FILTERS = {
  status: {
    label: "Status",
    kind: "checkboxes",
    options: STATUSES.map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
    })),
  },
  source: {
    label: "Source",
    kind: "checkboxes",
    options: SOURCES.map((source) => ({
      value: source,
      label: SOURCE_LABELS[source],
    })),
  },
  matchBand: {
    label: "Match band",
    kind: "checkboxes",
    options: MATCH_BANDS.map((band) => ({
      value: band,
      label: MATCH_BAND_LABELS[band],
    })),
  },
  candidateCountry: {
    label: "Candidate country",
    kind: "checkboxes",
    options: COUNTRIES.map(({ code, name }) => ({ value: code, label: name })),
  },
  candidateCity: {
    label: "Candidate city",
    kind: "checkboxes",
    options: CITIES.map((city) => ({ value: city, label: city })),
  },
  experience: {
    label: "Experience",
    kind: "checkboxes",
    options: EXPERIENCE_BUCKETS,
  },
  preferredJobFamily: {
    label: "Preferred job family",
    kind: "checkboxes",
    options: JOB_FAMILIES.map((family) => ({ value: family, label: family })),
  },
} satisfies ApplicationFilterFields;

export const APPLICATION_SORT_OPTIONS: readonly SortOption[] = [
  ["match_score:desc", "Rule score (high → low)"],
  ["match_score:asc", "Rule score (low → high)"],
  ["created_at:desc", "Newest first"],
  ["created_at:asc", "Oldest first"],
  ["score_disagreement:desc", "LLM vs rule-based gap"],
];

/** The URL parameter each filter state key is stored under. */
export const APPLICATION_FILTER_PARAMS: Record<ApplicationFilterKey, string> = {
  status: "status",
  source: "source",
  matchBand: "matchBand",
  candidateCountry: "candidateCountry",
  candidateCity: "candidateCity",
  experience: "experience",
  preferredJobFamily: "preferredJobFamily",
};

/** No filter selected is an empty list, which is what the checkboxes start at. */
export const APPLICATION_FILTER_DEFAULTS: Record<
  ApplicationFilterKey,
  string[]
> = {
  status: [],
  source: [],
  matchBand: [],
  candidateCountry: [],
  candidateCity: [],
  experience: [],
  preferredJobFamily: [],
};

/**
 * Several experience buckets ticked means "at least the lowest of them", so the
 * whole group collapses into one threshold the API can compare.
 */
export function minExperienceOf(
  selected: readonly string[],
): number | undefined {
  if (selected.length === 0) return undefined;
  return Math.min(...selected.map(Number));
}
