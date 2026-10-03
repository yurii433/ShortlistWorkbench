import { OpenRouter } from "@openrouter/sdk";

import { config } from "../../config.js";
import type { Candidate, Job, LlmScoreWithModel } from "../../types.js";
import { systemPrompt } from "./prompt.js";
import {
  parseLlmScore,
  scoreWithMock,
  buildUserContent,
} from "./llm.service.js";

async function scoreWithLLM(userContent: any): Promise<LlmScoreWithModel> {
  const client = new OpenRouter({ apiKey: config.openRouterApiKey });

  const completion = await client.chat.send({
    chatRequest: {
      model: "openrouter/auto",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    },
  });

  if (completion instanceof ReadableStream) {
    throw new Error("Expected a non-streaming response");
  }

  if (!completion.choices[0].message.content) {
    throw new Error("Non expected LLM response: no content to parse");
  }

  return {
    ...parseLlmScore(completion.choices[0].message.content),
    model: completion.model || "openrouter/auto",
  };
}

export async function scoreCandidate(
  job: Job,
  candidate: Candidate,
): Promise<LlmScoreWithModel> {
  if (config.llmMode === "live") {
    if (!config.openRouterApiKey) {
      throw new Error("LLM_MODE=live requires API_KEY");
    }
    return scoreWithLLM(buildUserContent(job, candidate));
  }
  return scoreWithMock(job, candidate);
}
