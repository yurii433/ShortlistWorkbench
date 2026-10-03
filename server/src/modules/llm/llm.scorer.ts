import { OpenRouter } from "@openrouter/sdk";

import { config } from "../../config.js";
import type { Candidate, Job, LlmScoreWithModel } from "../../types.js";
import { parseLlmScore, scoreWithMock } from "./llm.service.js";
import {
  buildUserContent,
  MATCH_SCORE_JSON_SCHEMA,
  systemPrompt,
} from "./prompt.js";

const MODEL = "openrouter/auto";

async function scoreWithLiveLlm(
  userContent: string,
): Promise<LlmScoreWithModel> {
  const client = new OpenRouter({ apiKey: config.openRouterApiKey });

  const completion = await client.chat.send({
    chatRequest: {
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "match_score",
          description: "A 0-100 match score and a one-sentence reason.",
          schema: MATCH_SCORE_JSON_SCHEMA,
          strict: true,
        },
      },
    },
  });

  if (completion instanceof ReadableStream) {
    throw new Error("Expected a non-streaming response");
  }

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("Unexpected LLM response: no content to parse");
  }

  return {
    ...parseLlmScore(content),
    model: completion.model || MODEL,
  };
}

export async function scoreCandidate(
  job: Job,
  candidate: Candidate,
): Promise<LlmScoreWithModel> {
  if (config.llmMode === "live") {
    if (!config.openRouterApiKey) {
      throw new Error("LLM_MODE=live requires OPENROUTER_API_KEY");
    }
    return scoreWithLiveLlm(buildUserContent(job, candidate));
  }
  return scoreWithMock(job, candidate);
}
