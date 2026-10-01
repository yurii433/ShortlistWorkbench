import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(root, ".env") });

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://shortlist:shortlist@localhost:5433/shortlist",
  llmMode: (process.env.LLM_MODE ?? "mock") as "mock" | "live",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
};
