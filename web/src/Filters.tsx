import { STATUSES } from "./api";
import type { WorkbenchQuery } from "./useWorkbenchQuery";

type Props = {
  query: WorkbenchQuery;
  onChange: (patch: Partial<WorkbenchQuery>) => void;
};

export function Filters({ query, onChange }: Props) {
  return (
    <div className="filters filters-candidates">
      <label>
        Status
        <select
          value={query.status}
          onChange={(event) => onChange({ status: event.target.value, page: 1 })}
        >
          <option value="">All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
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
            onChange({ sort, order, page: 1 });
          }}
        >
          <option value="match_score:desc">Match score (high → low)</option>
          <option value="match_score:asc">Match score (low → high)</option>
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="score_disagreement:desc">LLM vs rule-based gap</option>
        </select>
      </label>
    </div>
  );
}