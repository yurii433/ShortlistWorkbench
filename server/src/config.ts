import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
dotenv.config({ path: path.join(root, ".env") });

type LlmMode = "mock" | "live";

/** Fail loudly on a typo instead of silently falling back to the mock scorer. */
function readLlmMode(): LlmMode {
  const value = process.env.LLM_MODE ?? "mock";
  if (value !== "mock" && value !== "live") {
    throw new Error(`LLM_MODE must be "mock" or "live", got "${value}"`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://shortlist:shortlist@localhost:5433/shortlist",
  llmMode: readLlmMode(),
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
};
