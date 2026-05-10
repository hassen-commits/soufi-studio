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
    return c.json({ ok: false, error: String(e) }, 500);
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
