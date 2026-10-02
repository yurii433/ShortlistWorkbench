import {
  APPLICATION_FILTERS,
  APPLICATION_FILTER_DEFAULTS,
  APPLICATION_SORT_OPTIONS,
} from "../../applicationFilters";
import type { ApplicationsQueryState } from "../../pages/WorkbenchPage";
import { FilterBar } from "../ui/FilterBar";

type Props = {
  query: ApplicationsQueryState;
  onChange: (patch: Partial<ApplicationsQueryState>) => void;
};

/**
 * The candidate filters of the workbench. Which filters exist, what they are
 * called and which URL parameter each one lives under all come from
 * `APPLICATION_FILTERS`; this only says that changing one goes back to page 1.
 */
export function ApplicationFilters({ query, onChange }: Props) {
  return (
    <FilterBar
      fields={APPLICATION_FILTERS}
      state={query}
      onChange={(patch) => onChange({ ...patch, page: 1 })}
      onClear={() => onChange({ ...APPLICATION_FILTER_DEFAULTS, page: 1 })}
      sort={query.sort}
      order={query.order}
      onSort={(sort, order) => onChange({ sort, order, page: 1 })}
      sortOptions={APPLICATION_SORT_OPTIONS}
    />
  );
}