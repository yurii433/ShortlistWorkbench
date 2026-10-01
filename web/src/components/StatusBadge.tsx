import type { Status } from "../domain";
import { STATUS_LABELS } from "../domain";

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}
