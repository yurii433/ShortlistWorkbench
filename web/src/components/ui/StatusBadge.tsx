import type { Status } from "../../utils/domain";
import { STATUS_LABELS } from "../../utils/domain";
import "./StatusBadge.css";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
  );
}
