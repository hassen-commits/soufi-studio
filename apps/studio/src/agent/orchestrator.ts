import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, CLAUDE_MODEL } from "../lib/anthropic.js";
import { logger } from "../lib/logger.js";
import { TOOL_DEFS, executeTool } from "./tools.js";

export interface AgentInput {
  systemPrompt: string;
  userMessage: string;
  maxTurns?: number;
  maxTokens?: number;
}

export interface AgentOutput {
  text: string;
  turns: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  toolCalls: { name: string; input: unknown }[];
}

const MAX_TURNS_DEFAULT = 8;

export async function runAgent(input: AgentInput): Promise<AgentOutput> {
  const maxTurns = input.maxTurns ?? MAX_TURNS_DEFAULT;
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: input.userMessage },
  ];

  let turns = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  const toolCalls: AgentOutput["toolCalls"] = [];

  while (turns < maxTurns) {
    turns += 1;

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: input.maxTokens ?? 8192,
      system: [
        {
          type: "text",
          text: input.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: TOOL_DEFS,
      messages,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;
    cacheReadTokens += response.usage.cache_read_input_tokens ?? 0;
    cacheCreationTokens += response.usage.cache_creation_input_tokens ?? 0;

    logger.info(
      {
        turn: turns,
        stop: response.stop_reason,
        in: response.usage.input_tokens,
        out: response.usage.output_tokens,
        cache_read: response.usage.cache_read_input_tokens,
      },
      "agent turn",
    );

    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return {
        text,
        turns,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        toolCalls,
      };
    }

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
      );
      for (const tu of toolUses) {
        toolCalls.push({ name: tu.name, input: tu.input });
      }
      const toolResults = await Promise.all(toolUses.map(executeTool));
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // max_tokens : Claude n'a pas eu la place de finir. On garde son output
    // partiel et on lui demande poliment de continuer.
    if (response.stop_reason === "max_tokens") {
      logger.warn({ turn: turns }, "hit max_tokens, asking Claude to continue");
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content:
          "Continue exactement où tu t'es arrêté (ne répète rien). " +
          "Termine ce que tu as commencé, puis enchaîne sur les étapes restantes " +
          "(generate_audio si script complet, render_video si audio prêt).",
      });
      continue;
    }

    logger.warn({ stop: response.stop_reason }, "unexpected stop reason");
    break;
  }

  return {
    text: "[L'agent n'a pas pu produire de réponse dans le nombre de tours imparti.]",
    turns,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    toolCalls,
  };
}
