/** One selectable value of a filter. `value` is what the API receives. */
export type FilterOption = {
  value: string;
  label: string;
};

/**
 * One filter as the UI needs it. The key a field lives under is the key it
 * occupies in the page's query state; the URL name for that key lives in the
 * page's `*_FILTER_PARAMS` map, which is its only home.
 */
export type FilterField = {
  label: string;
  /** `checkboxes` for a multi-select group, `select` and `text` for one value. */
  kind: "checkboxes" | "select" | "text";
  options?: readonly FilterOption[];
  placeholder?: string;
};

/** `"sort:order"` pairs, because that is how the sort control stores them. */
export type SortOption = readonly [value: string, label: string];