import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Queryable } from "./queryable.js";

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

/**
 * Applies every migration in order. There is no version table yet — the first
 * migration drops and recreates the tables, so running it is always a reset.
 */
export async function applyMigrations(db: Queryable): Promise<void> {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await db.query(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
}