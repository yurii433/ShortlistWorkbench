/** Coercions shared by every row mapper. Postgres hands back Dates and nulls. */

export function toIsoDate(value: unknown): string {
  return new Date(String(value)).toISOString();
}

export function toIsoDateOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : toIsoDate(value);
}

/**
 * Free-text columns. An empty string means the same as NULL here: the note is
 * cleared by sending "", and the client should not have to see the difference.
 */
export function toTextOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text === "" ? null : text;
}