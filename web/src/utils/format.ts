/** "1–20 of 137 jobs" */
export function rangeLabel(
  page: number,
  pageSize: number,
  total: number,
  noun: string,
): string {
  if (total === 0) {
    return `0 ${noun}`;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `${from}–${to} of ${total} ${noun}`;
}

export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** The rule-based score is stored 0–1 but shown on the same 0–100 scale as the LLM. */
export function toPercent(score: number): number {
  return Math.round(score * 100);
}

/**
 * A stored timestamp in the reader's locale, or "" when it was never set. The
 * value is an ISO string produced by the API, so parsing is safe.
 */
export function toDateTime(value: string | null): string {
  const date = toValidDate(value);
  if (!date) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A stored date without the time, for table rows that only need the day. */
export function toDate(value: string | null): string {
  const date = toValidDate(value);
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A compact age such as "today", "4d ago" or "3mo ago". Table rows have no room
 * for a full date next to every other fact, and an age is what a recruiter
 * triaging a pipeline actually compares against.
 */
export function toAge(value: string | null): string {
  const date = toValidDate(value);
  if (!date) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Every stored timestamp is an ISO string from the API, so only "missing" fails. */
function toValidDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
