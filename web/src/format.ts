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
