import { runAgent } from "../agent/orchestrator.js";
import { PODCAST_SYSTEM_PROMPT } from "../agent/prompts.js";
import { findNextPlanned, updateEpisode } from "../lib/episodes.js";
import { logger } from "../lib/logger.js";
import { notifyAdminProductionDone } from "../lib/notify.js";

export interface WeeklyResult {
  ran: boolean;
  episodeId?: string;
  reason?: string;
  text?: string;
}

/**
 * Job de production hebdomadaire : prend le prochain épisode "planned",
 * lance l'agent pour générer le script + audio + vidéo, met à jour le statut.
 *
 * À planifier le dimanche 22h Europe/Paris pour publication lundi matin.
 */
export async function runWeeklyProduction(themeOverride?: {
  title: string;
  themeFr?: string;
  author?: string;
}): Promise<WeeklyResult> {
  let episode = await findNextPlanned();
  let theme: { title: string; themeFr?: string; author?: string };

  if (themeOverride) {
    theme = themeOverride;
  } else if (episode) {
    theme = {
      title: episode.title,
      themeFr: (episode.themes ?? [])[0],
      author: (episode.authors ?? [])[0],
    };
  } else {
    logger.warn("[weekly-production] No planned episode and no override theme — skipping");
    return { ran: false, reason: "no_planned_episode_and_no_override" };
  }

  logger.info({ theme, episodeId: episode?.id }, "[weekly-production] start");

  const userMessage =
    `Produis l'épisode hebdomadaire de Soufi Studio sur le thème : ${theme.title}.\n\n` +
    (theme.themeFr ? `Sous-thème : ${theme.themeFr}\n` : "") +
    (theme.author ? `Auteur principal : ${theme.author}\n` : "") +
    `\nÉtapes attendues :\n` +
    `1. rag_search pour rassembler 5-8 passages pertinents\n` +
    `2. translate_en_fr pour les passages anglais\n` +
    `3. Écris le script complet (15-20 min, 3 mouvements)\n` +
    `4. generate_audio avec un slug court\n` +
    `5. transcribe_audio sur l'audio généré\n` +
    `6. render_video PodcastLong avec audioUrl + props (title, themeFr, author)\n` +
    `7. (Optionnel) extrait 2-3 shorts du script et render_video ShortVertical pour chacun\n` +
    `\nNe publie PAS sur YouTube — l'humain validera avant.`;

  try {
    const result = await runAgent({
      systemPrompt: PODCAST_SYSTEM_PROMPT,
      userMessage,
      maxTurns: 24,
    });

    // Décide du status en fonction de ce que l'agent a RÉUSSI (pas juste appelé).
    // Avant : `calledRender = some(name === "render_video")` — un appel qui plante
    // donnait quand même `video_ready`. Maintenant on vérifie `isError !== true`.
    const audioOk = result.toolCalls.filter(
      (t) => t.name === "generate_audio" && !t.isError,
    );
    const renderOk = result.toolCalls.filter(
      (t) => t.name === "render_video" && !t.isError,
    );
    const hasScript = result.text && !result.text.startsWith("[L'agent");

    // Extrait les URLs depuis les résultats des tools réussis
    type AudioResult = { url?: string };
    type RenderResult = { composition?: string; url?: string };

    const firstAudioUrl =
      (audioOk[0]?.result as AudioResult | undefined)?.url ?? null;

    const longRenders = renderOk.filter(
      (t) => (t.result as RenderResult | undefined)?.composition === "PodcastLong",
    );
    const shortRenders = renderOk.filter(
      (t) => (t.result as RenderResult | undefined)?.composition === "ShortVertical",
    );

    const videoLongUrl =
      (longRenders[0]?.result as RenderResult | undefined)?.url ?? null;
    const shortClipUrls = shortRenders
      .map((t) => (t.result as RenderResult | undefined)?.url)
      .filter((u): u is string => typeof u === "string" && u.length > 0);

    let status: "script_ready" | "audio_ready" | "video_ready" | "failed";
    if (longRenders.length > 0) status = "video_ready";
    else if (audioOk.length > 0) status = "audio_ready";
    else if (hasScript) status = "script_ready";
    else status = "failed";

    if (episode) {
      const patch: Record<string, unknown> = {
        status,
        script_md: result.text,
      };
      if (firstAudioUrl) patch.audio_url = firstAudioUrl;
      if (videoLongUrl) patch.video_long_url = videoLongUrl;
      if (shortClipUrls.length > 0) patch.short_clip_urls = shortClipUrls;
      await updateEpisode(episode.id, patch as Partial<typeof episode>);
    }

    const toolCalls = result.toolCalls.map((t) => `${t.name}${t.isError ? "(err)" : ""}`);
    logger.info(
      {
        episodeId: episode?.id,
        turns: result.turns,
        status,
        toolCalls,
        audioUrl: firstAudioUrl,
        videoLongUrl,
        shortCount: shortClipUrls.length,
      },
      "[weekly-production] done",
    );

    // Notification admin : email "à valider" si on a atteint video_ready
    if (status === "video_ready" && episode) {
      notifyAdminProductionDone({
        episodeId: episode.id,
        title: episode.title,
        status,
        toolCalls,
      }).catch(() => undefined);
    }

    return { ran: true, episodeId: episode?.id, text: result.text };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ error: msg, episodeId: episode?.id }, "[weekly-production] failed");
    if (episode) {
      await updateEpisode(episode.id, { status: "failed" }).catch(() => undefined);
    }
    return { ran: true, episodeId: episode?.id, reason: msg };
  }
}
