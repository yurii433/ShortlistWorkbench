import { STATUSES, STATUS_LABELS } from "../../domain";
import type { ApplicationsQueryState } from "../../pages/WorkbenchPage";

type Props = {
  query: ApplicationsQueryState;
  onChange: (patch: Partial<ApplicationsQueryState>) => void;
};

const SORT_OPTIONS = [
  ["match_score:desc", "Match score (high → low)"],
  ["match_score:asc", "Match score (low → high)"],
  ["created_at:desc", "Newest first"],
  ["created_at:asc", "Oldest first"],
  ["score_disagreement:desc", "LLM vs rule-based gap"],
] as const;

export function ApplicationFilters({ query, onChange }: Props) {
  const change = (patch: Partial<ApplicationsQueryState>) =>
    onChange({ ...patch, page: 1 });

  return (
    <div className="filters filters-candidates">
      <label>
        Status
        <select
          value={query.status}
          onChange={(event) => change({ status: event.target.value })}
        >
          <option value="">All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
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
