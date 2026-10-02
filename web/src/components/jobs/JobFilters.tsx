import {
  JOB_FILTERS,
  JOB_FILTER_DEFAULTS,
  JOB_SORT_OPTIONS,
} from "../../jobFilters";
import type { JobsQueryState } from "../../pages/JobsPage";
import { FilterBar } from "../ui/FilterBar";

type Props = {
  query: JobsQueryState;
  onChange: (patch: Partial<JobsQueryState>) => void;
};

/** See `ApplicationFilters`: the field list lives in `JOB_FILTERS`. */
export function JobFilters({ query, onChange }: Props) {
  return (
    <FilterBar
      fields={JOB_FILTERS}
      state={query}
      onChange={(patch) => onChange({ ...patch, page: 1 })}
      onClear={() => onChange({ ...JOB_FILTER_DEFAULTS, page: 1 })}
      sort={query.sort}
      order={query.order}
      onSort={(sort, order) => onChange({ sort, order, page: 1 })}
      sortOptions={JOB_SORT_OPTIONS}
    />
  );
}