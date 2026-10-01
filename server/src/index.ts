import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool, reset } from "./db.js";
import { scoreWithLlm, mockScorer } from "./llm.js";
import type { Job, Candidate, LlmScore } from "./types.js";

const liveScorer = {
  model: "claude-haiku-4-5",
  async score(input: { job: Job; candidate: Candidate }): Promise<LlmScore> {
    return scoreWithLlm(input.job, input.candidate);
  },
};
const scorer = config.llmMode === "live" ? liveScorer : mockScorer;
const app = createApp(pool, scorer);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port} (LLM_MODE=${config.llmMode})`);
});
