import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";
import { seedFromCsv } from "./seed.js";

const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/schema.sql",
);

async function reset(): Promise<void> {
  const schema = fs.readFileSync(schemaPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(schema);
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
