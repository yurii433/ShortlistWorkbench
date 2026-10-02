import type { Application } from "../../domain";
import { toPercent } from "../../format";
import { StatusBadge } from "../ui/StatusBadge";

type Props = {
  item: Application;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function ApplicationRow({ item, selected, onSelect }: Props) {
  return (
    <tr
      className={selected ? "selected" : undefined}
      onClick={() => onSelect(item.application_id)}
    >
      <td>
        <strong>{item.candidate.full_name}</strong>
        <div className="tiny muted">
          {item.application_id} · {item.source}
        </div>
      </td>
      <td>{toPercent(item.match_score)}</td>
      <td>{item.llm_score ?? "—"}</td>
      <td>
        <StatusBadge status={item.status} />
      </td>
    </tr>
  );
}
