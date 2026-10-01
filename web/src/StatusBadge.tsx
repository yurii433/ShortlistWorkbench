import { STATUSES, type Status } from "./api";

const LABELS: Record<Status, string> = {
  new: "New",
  in_review: "In review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}

export { LABELS, STATUSES };
