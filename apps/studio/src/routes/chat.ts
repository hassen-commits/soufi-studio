import { Hono } from "hono";
import { z } from "zod";
import { runAgent } from "../agent/orchestrator.js";
import { SYSTEM_PROMPT_SOUFI } from "../agent/prompts.js";
import { logger } from "../lib/logger.js";

const chatBody = z.object({
  message: z.string().min(1).max(4000),
});

export const chatRoute = new Hono();

chatRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = chatBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const started = Date.now();
  try {
    const result = await runAgent({
      systemPrompt: SYSTEM_PROMPT_SOUFI,
      userMessage: parsed.data.message,
    });

    return c.json({
      response: result.text,
      meta: {
        turns: result.turns,
        latency_ms: Date.now() - started,
        tokens: {
          input: result.inputTokens,
          output: result.outputTokens,
          cache_read: result.cacheReadTokens,
          cache_creation: result.cacheCreationTokens,
        },
        tool_calls: result.toolCalls.map((t) => t.name),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, "chat error");
    return c.json({ error: "agent_failed", message: msg }, 500);
  }
});
