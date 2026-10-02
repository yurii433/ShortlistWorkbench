/** Coercions shared by every row mapper. Postgres hands back Dates and nulls. */

export function toIsoDate(value: unknown): string {
  return new Date(String(value)).toISOString();
}

export function toIsoDateOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : toIsoDate(value);
}

export function toTextOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}