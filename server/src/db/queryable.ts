import type { Pool } from "pg";

/**
 * The only slice of `pg` a repository is allowed to use. Tests pass a pool of
 * their own; anything that satisfies `query` will do.
 */
export type Queryable = Pick<Pool, "query">;