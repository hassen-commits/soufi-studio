import { runAgent } from "../agent/orchestrator.js";
import { PODCAST_SYSTEM_PROMPT } from "../agent/prompts.js";
import { findNextPlanned, updateEpisode } from "../lib/episodes.js";
import { logger } from "../lib/logger.js";

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

    if (episode) {
      await updateEpisode(episode.id, {
        status: "video_ready",
        script_md: result.text,
      });
    }

    logger.info(
      {
        episodeId: episode?.id,
        turns: result.turns,
        toolCalls: result.toolCalls.map((t) => t.name),
      },
      "[weekly-production] done",
    );

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
