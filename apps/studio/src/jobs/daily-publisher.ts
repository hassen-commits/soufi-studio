import { findReadyToPublish, updateEpisode } from "../lib/episodes.js";
import { publishYoutube } from "../agent/handlers/publish-youtube.js";
import { logger } from "../lib/logger.js";

export interface DailyResult {
  ran: boolean;
  episodeId?: string;
  youtubeId?: string;
  reason?: string;
}

/**
 * Job quotidien : prend le prochain épisode video_ready et le publie sur
 * YouTube + cross-poste sur les réseaux via le webhook.
 *
 * À planifier lundi-samedi 12h Europe/Paris.
 */
export async function runDailyPublisher(): Promise<DailyResult> {
  const episode = await findReadyToPublish();
  if (!episode) {
    logger.info("[daily-publisher] No video_ready episode — skipping");
    return { ran: false, reason: "no_video_ready" };
  }

  logger.info({ episodeId: episode.id, title: episode.title }, "[daily-publisher] start");

  // Choisir la vidéo à publier : préférer le short s'il existe, sinon le long
  const isShort = (episode.short_clip_urls ?? []).length > 0;
  const videoPath = isShort
    ? (episode.short_clip_urls ?? [])[0]!
    : episode.video_long_url;

  if (!videoPath) {
    logger.warn({ episodeId: episode.id }, "[daily-publisher] No video file path");
    await updateEpisode(episode.id, { status: "failed" }).catch(() => undefined);
    return { ran: false, reason: "no_video_file" };
  }

  try {
    // Publication en `unlisted` par défaut : l'humain valide visuellement
    // puis bascule en public via POST /admin/episodes/:id/privacy.
    // Évite qu'un rendu cassé/halluciné parte en public direct.
    const yt = await publishYoutube({
      video_path: videoPath,
      title: episode.title,
      description:
        (episode.description ?? "") +
        `\n\n— Soufi Studio · Passion_Coran\nhttps://studio.iavance.fr/episodes/${episode.slug}`,
      privacy: "unlisted",
      is_short: isShort,
    });

    // Pas de cross-post automatique tant que la vidéo est unlisted.
    // À déclencher après bascule en public.

    await updateEpisode(episode.id, {
      // status reste 'video_ready' — il passera à 'published' quand l'humain
      // bascule la vidéo en public via /admin/episodes/:id/privacy
      youtube_id: yt.videoId,
    });

    logger.info(
      { episodeId: episode.id, youtubeId: yt.videoId, url: yt.url },
      "[daily-publisher] done",
    );
    return { ran: true, episodeId: episode.id, youtubeId: yt.videoId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg, episodeId: episode.id }, "[daily-publisher] failed");
    await updateEpisode(episode.id, { status: "failed" }).catch(() => undefined);
    return { ran: true, episodeId: episode.id, reason: msg };
  }
}
