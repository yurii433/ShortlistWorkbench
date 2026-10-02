import { applyMigrations } from "../migrate.js";
import { pool } from "../pool.js";
import { seedFromCsv } from "./index.js";

export async function reset(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await applyMigrations(client);
    await seedFromCsv(client);
    await client.query("COMMIT");
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM jobs) AS jobs,
        (SELECT COUNT(*)::int FROM candidates) AS candidates,
        (SELECT COUNT(*)::int FROM applications) AS applications
    `);
    console.log("Database reset complete:", counts.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

reset().catch((error) => {
  console.error(error);
  process.exit(1);
});