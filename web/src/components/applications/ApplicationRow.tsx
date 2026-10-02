import type { Application } from "../../domain";
import { toPercent } from "../../format";
import { StatusBadge } from "../ui/StatusBadge";

type Props = {
  item: Application;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function ApplicationRow({ item, selected, onSelect }: Props) {
  const siblings = item.sibling_application_ids;
  const repeated = siblings.length > 0;

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
        <div className="tiny muted">
          {item.application_id} · {item.source}
        </div>
        {repeated ? (
          <div className="tiny duplicate-links">
            also applied as{" "}
            {siblings.map((id, index) => (
              <span key={id}>
                {index > 0 ? ", " : null}
                <a
                  href={`?id=${encodeURIComponent(id)}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onSelect(id);
                  }}
                >
                  {id}
                </a>
              </span>
            ))}
          </div>
        ) : null}
      </td>
      <td>{toPercent(item.match_score)}</td>
      <td>{item.llm_score ?? "—"}</td>
      <td>
        <StatusBadge status={item.status} />
      </td>
    </tr>
  );
}
