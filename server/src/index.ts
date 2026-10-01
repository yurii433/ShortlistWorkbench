import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { createMatchScorer } from "./services/llm/index.js";

const scorer = createMatchScorer();
const app = createApp(pool, scorer);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port} (LLM_MODE=${config.llmMode})`);
});
