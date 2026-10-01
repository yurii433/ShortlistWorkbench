import { config } from "../../config.js";
import type { MatchScorer } from "../../types.js";
import { AnthropicMatchScorer } from "./anthropic.js";
import { MockMatchScorer } from "./mock.js";

export function createMatchScorer(): MatchScorer {
  if (config.llmMode === "live") {
    if (!config.anthropicApiKey) {
      throw new Error("LLM_MODE=live requires ANTHROPIC_API_KEY");
    }
    return new AnthropicMatchScorer(config.anthropicApiKey);
  }
  return new MockMatchScorer();
}
