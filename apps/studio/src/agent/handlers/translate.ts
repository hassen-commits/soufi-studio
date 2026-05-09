import { anthropic, CLAUDE_MODEL } from "../../lib/anthropic.js";
import { logger } from "../../lib/logger.js";
import { TRANSLATION_PROMPT } from "../prompts.js";

export interface TranslateInput {
  text: string;
  source_work?: string;
}

export async function translateEnFr(input: TranslateInput): Promise<string> {
  logger.info({ work: input.source_work, len: input.text.length }, "translate_en_fr");

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: TRANSLATION_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: input.text }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Translation response empty");
  }
  return block.text.trim();
}
