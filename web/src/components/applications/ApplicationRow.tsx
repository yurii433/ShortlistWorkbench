import type { Application } from "../../domain";
import { MATCH_BAND_LABELS, SOURCE_LABELS } from "../../domain";
import { toAge, toDate, toPercent } from "../../format";
import { StatusBadge } from "../ui/StatusBadge";

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
        <strong>{item.candidate.full_name}</strong>
        {repeated ? (
          <span
            className="badge badge-duplicate"
            title="Applied to this job more than once"
          >
            {siblings.length + 1} applications
          </span>
        ) : null}
        <div className="tiny muted" title={item.candidate.email}>
          {item.candidate.email} · ID: {item.application_id}
        </div>
        {repeated ? (
          <div className="tiny duplicate-links">
            also applied as{" "}
            {siblings.map((id, index) => (
              <span key={id}>
                {index > 0 ? ", " : null}
                <button
                  type="button"
                  className="link-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(id);
                  }}
                >
                  {id}
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </td>
      <td>
        {item.candidate.city}, {item.candidate.country}
        <div className="tiny muted">
          {item.candidate.years_experience} years experience
        </div>
        <div className="tiny muted cell-clamp">
          Prefers {item.candidate.preferred_job_family}
        </div>
      </td>
      <td>
        <div className="score-cell">
          <span className="badge badge-score">{match}</span>
          <span className="badge badge-llm">{item.llm_score ?? "-"}</span>
        </div>
        <div className="tiny muted">{MATCH_BAND_LABELS[item.match_band]} band</div>
      </td>
      <td>
        <StatusBadge status={item.status} />
        {item.status_updated_at ? (
          <div className="tiny muted">moved {toAge(item.status_updated_at)}</div>
        ) : (
          <div className="tiny muted">never moved</div>
        )}
        {item.recruiter_note ? (
          <div className="tiny muted cell-clamp" title={item.recruiter_note}>
            “{item.recruiter_note}”
          </div>
        ) : null}
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