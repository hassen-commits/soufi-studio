import {
  findReadyToPublishLong,
  findReadyToPublishShort,
  updateEpisode,
} from "../lib/episodes.js";
import { publishYoutube } from "../agent/handlers/publish-youtube.js";
import { logger } from "../lib/logger.js";

export interface DailyResult {
  ran: boolean;
  episodeId?: string;
  youtubeId?: string;
  type?: "long" | "short";
  reason?: string;
}

/**
 * Job quotidien : publie sur YouTube en deux phases :
 *
 * 1. **LONG d'abord** — toute épisode `video_ready` ayant `video_long_url`
 *    mais pas encore de `youtube_id` est uploadé. C'est la vidéo canonique.
 * 2. **SHORTS ensuite** — uniquement si plus aucun long en attente. Trouve
 *    un épisode dont la longueur de `short_clip_urls` est supérieure à celle
 *    de `short_youtube_ids` et uploade le prochain short manquant.
 *
 * Tous les uploads se font en `unlisted` — l'humain valide visuellement
 * puis bascule en public via POST /admin/episodes/:id/privacy.
 */
export async function runDailyPublisher(): Promise<DailyResult> {
  // ============================================================
  // Phase 1 : LONG
  // ============================================================
  const longEpisode = await findReadyToPublishLong();
  if (longEpisode && longEpisode.video_long_url) {
    logger.info(
      { episodeId: longEpisode.id, title: longEpisode.title, type: "long" },
      "[daily-publisher] start LONG",
    );
    try {
      const yt = await publishYoutube({
        video_path: longEpisode.video_long_url,
        title: longEpisode.title,
        description:
          (longEpisode.description ?? "") +
          `\n\n— Soufi Studio · Passion_Coran\nhttps://studio.iavance.fr/episodes/${longEpisode.slug}`,
        privacy: "unlisted",
        is_short: false,
      });
      await updateEpisode(longEpisode.id, { youtube_id: yt.videoId });
      logger.info(
        { episodeId: longEpisode.id, youtubeId: yt.videoId, type: "long" },
        "[daily-publisher] done LONG",
      );
      return {
        ran: true,
        episodeId: longEpisode.id,
        youtubeId: yt.videoId,
        type: "long",
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { error: msg, episodeId: longEpisode.id, type: "long" },
        "[daily-publisher] failed LONG",
      );
      return { ran: true, episodeId: longEpisode.id, reason: msg };
    }
  }

  // ============================================================
  // Phase 2 : SHORTS (un à la fois, le prochain pas encore uploadé)
  // ============================================================
  const shortEpisode = await findReadyToPublishShort();
  if (shortEpisode) {
    const shorts = shortEpisode.short_clip_urls ?? [];
    const uploadedIds = shortEpisode.short_youtube_ids ?? [];
    const nextIdx = uploadedIds.length;
    const videoPath = shorts[nextIdx];
    if (!videoPath) {
      return { ran: false, reason: "short_index_mismatch" };
    }

    logger.info(
      { episodeId: shortEpisode.id, shortIdx: nextIdx, videoPath, type: "short" },
      "[daily-publisher] start SHORT",
    );
    try {
      const shortTitle = `${shortEpisode.title} · Short ${nextIdx + 1}`.slice(0, 100);
      const yt = await publishYoutube({
        video_path: videoPath,
        title: shortTitle,
        description:
          (shortEpisode.description ?? "") +
          `\n\n— Soufi Studio · Passion_Coran\nhttps://studio.iavance.fr/episodes/${shortEpisode.slug}`,
        privacy: "unlisted",
        is_short: true,
      });
      const newShortIds = [...uploadedIds, yt.videoId];
      await updateEpisode(shortEpisode.id, { short_youtube_ids: newShortIds });
      logger.info(
        { episodeId: shortEpisode.id, youtubeId: yt.videoId, shortIdx: nextIdx, type: "short" },
        "[daily-publisher] done SHORT",
      );
      return {
        ran: true,
        episodeId: shortEpisode.id,
        youtubeId: yt.videoId,
        type: "short",
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        { error: msg, episodeId: shortEpisode.id, type: "short" },
        "[daily-publisher] failed SHORT",
      );
      return { ran: true, episodeId: shortEpisode.id, reason: msg };
    }
  }

  logger.info("[daily-publisher] nothing to upload — skipping");
  return { ran: false, reason: "nothing_to_upload" };
}
