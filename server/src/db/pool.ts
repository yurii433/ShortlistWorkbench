import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

/** The single pool the process uses, pointed at the configured database. */
export const pool = new Pool({ connectionString: config.databaseUrl });

export type { PoolClient } from "pg";