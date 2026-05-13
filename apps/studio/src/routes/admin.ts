import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { z } from "zod";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import {
  countEpisodesByStatus,
  listEpisodes,
  type EpisodeStatus,
} from "../lib/episodes.js";
import { runWeeklyProduction } from "../jobs/weekly-production.js";
import { runDailyPublisher } from "../jobs/daily-publisher.js";

export const adminRoute = new Hono();

if (env.ADMIN_TOKEN) {
  adminRoute.use("*", bearerAuth({ token: env.ADMIN_TOKEN }));
}

adminRoute.get("/", (c) =>
  c.json({
    service: "soufi-studio admin",
    cron_enabled: env.CRON_ENABLED,
    timezone: env.CRON_TIMEZONE,
    routes: [
      "GET  /admin/stats",
      "GET  /admin/episodes",
      "POST /admin/run/weekly-production",
      "POST /admin/run/daily-publisher",
    ],
  }),
);

adminRoute.get("/stats", async (c) => {
  try {
    const counts = await countEpisodesByStatus();
    return c.json({ counts, total: Object.values(counts).reduce((a, b) => a + b, 0) });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

adminRoute.get("/episodes", async (c) => {
  const status = c.req.query("status") as EpisodeStatus | undefined;
  const limit = Number(c.req.query("limit") ?? 50);
  try {
    const episodes = await listEpisodes({ status, limit });
    return c.json({ episodes, count: episodes.length });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

const triggerBody = z.object({
  theme: z
    .object({
      title: z.string(),
      themeFr: z.string().optional(),
      author: z.string().optional(),
    })
    .optional(),
});

adminRoute.post("/run/weekly-production", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = triggerBody.safeParse(body);
  logger.info({ body: parsed.data }, "admin: trigger weekly-production");
  try {
    const result = await runWeeklyProduction(parsed.data?.theme);
    return c.json({ ok: true, result });
  } catch (e) {
    return c.json({ ok: false, error: String(e), stack: e instanceof Error ? e.stack : undefined }, 500);
  }
});

// Endpoint diagnostic — test direct d'un tool individuel pour isoler les plantages
adminRoute.post("/test/tool", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const schema = z.object({
    tool: z.enum(["rag_search", "translate_en_fr", "generate_audio", "transcribe_audio", "render_video"]),
    input: z.record(z.unknown()),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }
  const { tool, input } = parsed.data;
  const { ragSearch } = await import("../agent/handlers/rag-search.js");
  const { translateEnFr } = await import("../agent/handlers/translate.js");
  const { generateAudio } = await import("../agent/handlers/audio.js");
  const { transcribe } = await import("../agent/handlers/transcribe.js");
  const { renderVideo } = await import("../agent/handlers/render-video.js");
  const started = Date.now();
  try {
    let result: unknown;
    switch (tool) {
      case "rag_search":         result = await ragSearch(input as never); break;
      case "translate_en_fr":    result = await translateEnFr(input as never); break;
      case "generate_audio":     result = await generateAudio(input as never); break;
      case "transcribe_audio":   result = await transcribe(input as never); break;
      case "render_video":       result = await renderVideo(input as never); break;
    }
    return c.json({ ok: true, tool, duration_ms: Date.now() - started, result });
  } catch (e) {
    return c.json({
      ok: false,
      tool,
      duration_ms: Date.now() - started,
      error: String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 10).join("\n") : undefined,
    }, 500);
  }
});

adminRoute.post("/run/daily-publisher", async (c) => {
  logger.info("admin: trigger daily-publisher");
  try {
    const result = await runDailyPublisher();
    return c.json({ ok: true, result });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});
