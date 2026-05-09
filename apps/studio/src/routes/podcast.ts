import { Hono } from "hono";
import { z } from "zod";
import { runAgent } from "../agent/orchestrator.js";
import { PODCAST_SYSTEM_PROMPT } from "../agent/prompts.js";
import { logger } from "../lib/logger.js";

const podcastBody = z.object({
  theme: z.string().min(3).max(500),
  author: z
    .enum(["rumi", "ibn_arabi", "ghazali", "tustari", "maitres_soufis"])
    .optional(),
  generate_audio: z.boolean().default(false),
});

export const podcastRoute = new Hono();

podcastRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = podcastBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }

  const { theme, author, generate_audio: gen } = parsed.data;
  const userMessage =
    `Écris un script de podcast sur le thème suivant : ${theme}.\n\n` +
    (author ? `Centre-toi sur les enseignements de ${author}.\n\n` : "") +
    (gen
      ? "Quand le script est complet, appelle l'outil generate_audio avec le " +
        "texte final (sans les indications [silence] etc.) et un slug court."
      : "Ne génère PAS d'audio. Livre seulement le script.");

  const started = Date.now();
  try {
    const result = await runAgent({
      systemPrompt: PODCAST_SYSTEM_PROMPT,
      userMessage,
      maxTurns: 12,
    });

    const audioCall = result.toolCalls.find((t) => t.name === "generate_audio");

    return c.json({
      script: result.text,
      audio_generated: Boolean(audioCall),
      meta: {
        turns: result.turns,
        latency_ms: Date.now() - started,
        tokens: {
          input: result.inputTokens,
          output: result.outputTokens,
          cache_read: result.cacheReadTokens,
        },
        tool_calls: result.toolCalls.map((t) => t.name),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg }, "podcast error");
    return c.json({ error: "podcast_failed", message: msg }, 500);
  }
});
