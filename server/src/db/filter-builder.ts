/**
 * Collects the `WHERE` predicates of a list query together with the values they
 * bind. Every value is a bound parameter; only the column and the operator come
 * from the calling module's own allowlist, so no user text ever reaches SQL.
 *
 * Predicates are skipped when the filter is not set, which is what makes an
 * unset filter and an empty list mean the same thing: no restriction.
 */
export class FilterBuilder {
  private readonly predicates: string[] = [];
  private readonly values: unknown[] = [];

  /** `column = $n`. A blank value means "not filtering". */
  eq(column: string, value: string | undefined): this {
    if (!value) return this;
    this.values.push(value);
    this.predicates.push(`${column} = $${this.values.length}`);
    return this;
  }

  /** `column IN ($n, $n + 1, …)`. An empty list means "not filtering". */
  in(column: string, selected: readonly string[] | undefined): this {
    if (!selected || selected.length === 0) return this;
    const first = this.values.length + 1;
    const placeholders = selected.map((_, index) => `$${first + index}`);
    this.predicates.push(`${column} IN (${placeholders.join(", ")})`);
    this.values.push(...selected);
    return this;
  }

  /** `column >= $n`, for a threshold filter such as minimum years of experience. */
  atLeast(column: string, value: number | undefined): this {
    if (value === undefined) return this;
    this.values.push(value);
    this.predicates.push(`${column} >= $${this.values.length}`);
    return this;
  }

  /** `column IS NOT NULL`, for a predicate that binds no value. */
  isNotNull(column: string): this {
    this.predicates.push(`${column} IS NOT NULL`);
    return this;
  }

  /** `col ILIKE $n OR …` across several columns, sharing one bound needle. */
  containsAny(columns: readonly string[], needle: string): this {
    if (needle === "") return this;
    this.values.push(needle);
    const placeholder = `$${this.values.length}`;
    this.predicates.push(
      `(${columns.map((column) => `${column} ILIKE ${placeholder}`).join(" OR ")})`,
    );
    return this;
  }

  /** `"WHERE a AND b"`, or `""` when nothing is filtered. */
  where(): string {
    return this.predicates.length === 0 ? "" : `WHERE ${this.predicates.join(" AND ")}`;
  }

  /** The bound values, in the order `where()` references them. */
  params(): unknown[] {
    return [...this.values];
  }
}