import type Anthropic from "@anthropic-ai/sdk";
import { ragSearch, type RagSearchInput } from "./handlers/rag-search.js";
import { translateEnFr, type TranslateInput } from "./handlers/translate.js";
import { generateAudio, type GenerateAudioInput } from "./handlers/audio.js";
import { renderVideo, type RenderVideoInput } from "./handlers/render-video.js";
import { logger } from "../lib/logger.js";

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "rag_search",
    description:
      "Recherche sémantique dans le corpus soufi (~13 758 extraits de Rûmî, " +
      "Ibn ʿArabî, al-Ghazâlî, al-Tustarî et autres maîtres). Retourne les passages " +
      "les plus proches de la requête. À utiliser systématiquement avant de répondre " +
      "à une question spirituelle ou de citer un maître.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Question ou thème à rechercher dans le corpus, en français.",
        },
        author: {
          type: "string",
          enum: ["rumi", "ibn_arabi", "ghazali", "tustari", "maitres_soufis"],
          description:
            "Filtrer sur un maître précis. Omettre pour chercher dans tout le corpus.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          default: 5,
          description: "Nombre de passages à retourner.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "translate_en_fr",
    description:
      "Traduit un passage anglais en français littéraire (registre des grands " +
      "traducteurs de poésie mystique). À utiliser pour les passages anglais " +
      "(Tustari, certains Ghazâlî) avant de les citer en français.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Passage anglais à traduire." },
        source_work: {
          type: "string",
          description: "Œuvre source (ex : 'Tafsîr al-Tustarî') pour la mention.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "generate_audio",
    description:
      "Génère un fichier audio (mp3) à partir d'un texte français en utilisant " +
      "la voix Soufi Studio (ElevenLabs). À n'appeler que pour produire un podcast " +
      "ou un short final, jamais pour répondre à une question conversationnelle. " +
      "Retourne notamment 'url' (ex: '/media/xxx.mp3') à passer à render_video.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Texte français complet à synthétiser." },
        slug: {
          type: "string",
          description: "Identifiant court pour le nom de fichier (ex: 'rumi-roseau').",
        },
      },
      required: ["text", "slug"],
    },
  },
  {
    name: "render_video",
    description:
      "Compose et rend la vidéo finale via Remotion. Deux compositions disponibles : " +
      "ShortVertical (9:16, TikTok/Reels/Shorts, citation animée) et PodcastLong " +
      "(16:9, YouTube long format, titre + auteur + waveform). Si une URL audio est " +
      "fournie dans props.audioUrl, la durée vidéo s'aligne automatiquement sur " +
      "celle de l'audio. Appeler après generate_audio pour ajouter le son.",
    input_schema: {
      type: "object",
      properties: {
        composition: {
          type: "string",
          enum: ["ShortVertical", "PodcastLong"],
          description: "Format vidéo : ShortVertical (9:16) ou PodcastLong (16:9).",
        },
        output_filename: {
          type: "string",
          description: "Nom du fichier MP4 final (ex: 'rumi-silence.mp4').",
        },
        props: {
          type: "object",
          description:
            "Props de la composition. Pour ShortVertical : { citation: { text, author, work? }, audioUrl? }. " +
            "Pour PodcastLong : { title, episodeNumber?, author?, themeFr?, audioUrl? }. " +
            "Pour audioUrl, utiliser l'URL retournée par generate_audio préfixée par http://localhost:3001.",
        },
      },
      required: ["composition", "output_filename", "props"],
    },
  },
];

type ToolUseBlock = Anthropic.Messages.ToolUseBlock;
type ToolResultBlock = Anthropic.Messages.ToolResultBlockParam;

export async function executeTool(block: ToolUseBlock): Promise<ToolResultBlock> {
  const { name, input, id } = block;
  try {
    let result: unknown;
    switch (name) {
      case "rag_search":
        result = await ragSearch(input as RagSearchInput);
        break;
      case "translate_en_fr":
        result = { translation: await translateEnFr(input as TranslateInput) };
        break;
      case "generate_audio":
        result = await generateAudio(input as GenerateAudioInput);
        break;
      case "render_video":
        result = await renderVideo(input as RenderVideoInput);
        break;
      default:
        throw new Error(`Outil inconnu : ${name}`);
    }
    return {
      type: "tool_result",
      tool_use_id: id,
      content: JSON.stringify(result),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ tool: name, error: msg }, "tool execution failed");
    return {
      type: "tool_result",
      tool_use_id: id,
      content: JSON.stringify({ error: msg }),
      is_error: true,
    };
  }
}
