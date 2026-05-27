import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { z } from "zod";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import {
  countEpisodesByStatus,
  createPlannedEpisode,
  deleteEpisode,
  getEpisode,
  listEpisodes,
  updateEpisode,
  type EpisodeStatus,
} from "../lib/episodes.js";
import { runWeeklyProduction } from "../jobs/weekly-production.js";
import { runDailyPublisher } from "../jobs/daily-publisher.js";
import { publishYoutube } from "../agent/handlers/publish-youtube.js";
import { setVideoPrivacy, type PrivacyStatus } from "../lib/youtube-privacy.js";

export const adminRoute = new Hono();

if (env.ADMIN_TOKEN) {
  adminRoute.use("*", bearerAuth({ token: env.ADMIN_TOKEN }));
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

adminRoute.get("/", (c) =>
  c.json({
    service: "soufi-studio admin",
    cron_enabled: env.CRON_ENABLED,
    timezone: env.CRON_TIMEZONE,
    routes: [
      "GET    /admin/stats",
      "GET    /admin/episodes",
      "POST   /admin/episodes               (créer un episode planned)",
      "POST   /admin/episodes/:id/produce   (lancer la prod immédiatement)",
      "POST   /admin/episodes/:id/privacy   (basculer la vidéo YT en public/unlisted/private)",
      "DELETE /admin/episodes/:id           (supprimer)",
      "POST   /admin/run/weekly-production",
      "POST   /admin/run/daily-publisher",
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

// Créer un nouvel épisode `planned` à partir d'un thème éditorial
const createEpisodeBody = z.object({
  title: z.string().min(3).max(200),
  themeFr: z.string().min(2).max(80).optional(),
  author: z.string().optional(),
  description: z.string().max(2000).optional(),
  slug: z.string().min(3).max(80).optional(),
});

adminRoute.post("/episodes", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createEpisodeBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }
  const { title, themeFr, author, description } = parsed.data;
  const slug = parsed.data.slug ?? slugify(title);
  try {
    const ep = await createPlannedEpisode({ slug, title, themeFr, author, description });
    return c.json({ ok: true, episode: ep }, 201);
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// Déclencher la production d'un épisode précis (script + audio + render)
adminRoute.post("/episodes/:id/produce", async (c) => {
  const id = c.req.param("id");
  try {
    const ep = await getEpisode(id);
    if (!ep) return c.json({ error: "not_found" }, 404);
    // On passe themeOverride ET episodeId pour que weekly-production cible
    // l'épisode cliqué, pas le plus ancien planifié.
    const result = await runWeeklyProduction(
      {
        title: ep.title,
        themeFr: (ep.themes ?? [])[0],
        author: (ep.authors ?? [])[0],
      },
      id,
    );
    return c.json({ ok: true, result });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// Bascule la confidentialité de la vidéo YouTube + update DB
const privacyBody = z.object({
  privacy: z.enum(["public", "unlisted", "private"]),
});

adminRoute.post("/episodes/:id/privacy", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = privacyBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", details: parsed.error.flatten() }, 400);
  }
  try {
    const ep = await getEpisode(id);
    if (!ep) return c.json({ error: "not_found" }, 404);
    if (!ep.youtube_id) {
      return c.json({ error: "no_youtube_id" }, 400);
    }
    const result = await setVideoPrivacy(ep.youtube_id, parsed.data.privacy as PrivacyStatus);
    // Si on bascule en public et que l'épisode n'avait pas published_at, on le pose
    const patch: Partial<typeof ep> = {};
    if (parsed.data.privacy === "public" && !ep.published_at) {
      patch.published_at = new Date().toISOString();
      patch.status = "published";
    }
    if (Object.keys(patch).length > 0) {
      await updateEpisode(id, patch);
    }
    return c.json({ ok: true, youtube: result });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// Upload sur YouTube de l'épisode spécifié : d'abord le LONG si pas encore
// uploadé, sinon le prochain SHORT manquant. Reproduit la logique de
// daily-publisher mais ciblée sur un épisode précis (bouton "Publier" du
// dashboard).
adminRoute.post("/episodes/:id/publish-youtube", async (c) => {
  const id = c.req.param("id");
  try {
    const ep = await getEpisode(id);
    if (!ep) return c.json({ error: "not_found" }, 404);

    const descBase =
      (ep.description ?? "") +
      `\n\n— Soufi Studio · Passion_Coran\nhttps://studio.iavance.fr/episodes/${ep.slug}`;

    // Phase 1 : LONG
    if (ep.video_long_url && !ep.youtube_id) {
      const yt = await publishYoutube({
        video_path: ep.video_long_url,
        title: ep.title,
        description: descBase,
        privacy: "unlisted",
        is_short: false,
      });
      await updateEpisode(ep.id, { youtube_id: yt.videoId });
      return c.json({ ok: true, type: "long", youtubeId: yt.videoId });
    }

    // Phase 2 : prochain SHORT manquant
    const shorts = ep.short_clip_urls ?? [];
    const uploadedIds = ep.short_youtube_ids ?? [];
    const nextIdx = uploadedIds.length;
    if (nextIdx < shorts.length) {
      const videoPath = shorts[nextIdx];
      if (!videoPath) {
        return c.json({ error: "short_index_mismatch" }, 400);
      }
      const shortTitle = `${ep.title} · Short ${nextIdx + 1}`.slice(0, 100);
      const yt = await publishYoutube({
        video_path: videoPath,
        title: shortTitle,
        description: descBase,
        privacy: "unlisted",
        is_short: true,
      });
      const newShortIds = [...uploadedIds, yt.videoId];
      await updateEpisode(ep.id, { short_youtube_ids: newShortIds });
      return c.json({
        ok: true,
        type: "short",
        shortIdx: nextIdx,
        youtubeId: yt.videoId,
      });
    }

    return c.json({ error: "nothing_to_upload" }, 400);
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

adminRoute.delete("/episodes/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await deleteEpisode(id);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
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
