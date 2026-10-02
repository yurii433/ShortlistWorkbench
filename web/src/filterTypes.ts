/** One selectable value of a filter. `value` is what the API receives. */
export type FilterOption = {
  value: string;
  label: string;
};

/**
 * One filter as the UI needs it. The key a field lives under is the key it
 * occupies in the page's query state, so the same definition drives rendering,
 * the URL and the request without a second list to keep in sync.
 */
export type FilterField = {
  /** URL query-string key this filter is stored under. */
  param: string;
  label: string;
  /** `checkboxes` for a multi-select group, `select` and `text` for one value. */
  kind: "checkboxes" | "select" | "text";
  options?: readonly FilterOption[];
  placeholder?: string;
};

/** `"sort:order"` pairs, because that is how the sort control stores them. */
export type SortOption = readonly [value: string, label: string];