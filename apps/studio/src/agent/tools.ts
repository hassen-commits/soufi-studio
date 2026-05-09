import type Anthropic from "@anthropic-ai/sdk";
import { ragSearch, type RagSearchInput } from "./handlers/rag-search.js";
import { translateEnFr, type TranslateInput } from "./handlers/translate.js";
import { generateAudio, type GenerateAudioInput } from "./handlers/audio.js";
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
      "ou un short final, jamais pour répondre à une question conversationnelle.",
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
