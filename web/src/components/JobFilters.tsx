import { COUNTRIES, JOB_FAMILIES } from "../domain";
import type { JobsQueryState } from "../pages/useJobsQuery";

type Props = {
  query: JobsQueryState;
  onChange: (patch: Partial<JobsQueryState>) => void;
};

const SORT_OPTIONS = [
  ["application_count:desc", "Most applicants"],
  ["application_count:asc", "Fewest applicants"],
  ["created_at:desc", "Newest first"],
  ["created_at:asc", "Oldest first"],
  ["title:asc", "Title (A → Z)"],
  ["title:desc", "Title (Z → A)"],
] as const;

export function JobFilters({ query, onChange }: Props) {
  // Any filter change resets to page 1 so the recruiter never lands on an
  // out-of-range page.
  const change = (patch: Partial<JobsQueryState>) =>
    onChange({ ...patch, page: 1 });

  return (
    <div className="filters filters-jobs">
      <label>
        Search
        <input
          type="search"
          value={query.search}
          placeholder="Title or city"
          onChange={(event) => change({ search: event.target.value })}
        />
      </label>
      <label>
        Country
        <select
          value={query.country}
          onChange={(event) => change({ country: event.target.value })}
        >
          <option value="">All</option>
          {COUNTRIES.map(({ code, name }) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Job family
        <select
          value={query.jobFamily}
          onChange={(event) => change({ jobFamily: event.target.value })}
        >
          <option value="">All</option>
          {JOB_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {family}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sort
        <select
          value={`${query.sort}:${query.order}`}
          onChange={(event) => {
            const [sort, order] = event.target.value.split(":");
            change({ sort, order });
          }}
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
