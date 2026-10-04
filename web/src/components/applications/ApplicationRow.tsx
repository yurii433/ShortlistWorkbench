import type { Application } from "../../domain";
import { SOURCE_LABELS } from "../../domain";
import { toAge, toDate, toPercent } from "../../format";
import { StatusBadge } from "../ui/StatusBadge";
import "./ApplicationRow.css";

type Props = {
  item: Application;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function ApplicationRow({ item, selected, onSelect }: Props) {
  const siblings = item.sibling_application_ids;
  const repeated = siblings.length > 0;
  const match = toPercent(item.match_score);

  return (
    <tr
      className={selected ? "selected" : undefined}
      onClick={() => onSelect(item.application_id)}
    >
      <td>
        {item.candidate.full_name}
        <br />
        {repeated ? (
          <span className="badge badge-duplicate">
            {siblings.length + 1} applications
          </span>
        ) : null}
      </td>
      <td>
        {item.candidate.city}, {item.candidate.country}
        <div className="tiny muted">
          {item.candidate.years_experience} years exp.
        </div>
        <div className="tiny muted cell-clamp">
          {item.candidate.preferred_job_family}
        </div>
      </td>
      <td>
        <div className="score-cell">
          <span className="badge badge-score">{match}</span>
          <span className="badge badge-llm">{item.llm_score ?? "-"}</span>
        </div>
      </td>
      <td>
        <StatusBadge status={item.status} />
      </td>
      <td>
        <div className="nowrap">{toDate(item.created_at)}</div>
        <div className="tiny muted">
          {SOURCE_LABELS[item.source]} · {toAge(item.created_at)}
        </div>
      </td>
    </tr>
  );
}
