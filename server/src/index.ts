import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";

const app = createApp(pool);

app.listen(config.port, () => {
  console.log(
    `API listening on http://localhost:${config.port} (LLM_MODE=${config.llmMode})`,
  );
});
