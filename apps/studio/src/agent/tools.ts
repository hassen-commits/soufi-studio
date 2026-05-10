import type Anthropic from "@anthropic-ai/sdk";
import { ragSearch, type RagSearchInput } from "./handlers/rag-search.js";
import { translateEnFr, type TranslateInput } from "./handlers/translate.js";
import { generateAudio, type GenerateAudioInput } from "./handlers/audio.js";
import { transcribe, type TranscribeInput } from "./handlers/transcribe.js";
import { renderVideo, type RenderVideoInput } from "./handlers/render-video.js";
import { publishYoutube, type PublishYouTubeInput } from "./handlers/publish-youtube.js";
import { publishWebhook, type PublishWebhookInput } from "./handlers/publish-webhook.js";
import { sendNewsletter, type SendNewsletterInput } from "./handlers/send-newsletter.js";
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
    name: "publish_youtube",
    description:
      "Upload une vidéo MP4 sur YouTube via l'API Data v3. Retourne l'ID YouTube " +
      "et l'URL publique. Pour un YouTube Short, mettre is_short: true (ajoute " +
      "automatiquement #Shorts au titre/description). Privacy par défaut : private — " +
      "passer 'public' pour publier directement, 'unlisted' pour une URL secrète.",
    input_schema: {
      type: "object",
      properties: {
        video_path: {
          type: "string",
          description:
            "Chemin local ou /media/xxx.mp4 (idéalement la valeur 'url' retournée par render_video).",
        },
        title: {
          type: "string",
          description: "Titre (max 100 chars).",
        },
        description: {
          type: "string",
          description:
            "Description (max 5000 chars). Inclure timestamps de chapitres et liens utiles.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Tags YouTube (30 max). Si omis, tags par défaut soufisme/rûmî/ibn arabi/etc.",
        },
        privacy: {
          type: "string",
          enum: ["public", "unlisted", "private"],
          description: "Visibilité (default: private — l'utilisateur doit confirmer avant public).",
        },
        is_short: {
          type: "boolean",
          description: "true pour YouTube Shorts (ajoute #Shorts).",
        },
      },
      required: ["video_path", "title", "description"],
    },
  },
  {
    name: "publish_social",
    description:
      "Publie sur TikTok / Instagram Reels / Twitter / LinkedIn via un webhook " +
      "générique (à brancher sur Buffer, Make, Zapier ou n8n). Le payload envoyé " +
      "contient channel, text, media_url et metadata. À utiliser pour cross-poster " +
      "un short après l'avoir uploadé sur YouTube ou rendu en MP4.",
    input_schema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          enum: ["tiktok", "instagram_reels", "twitter", "linkedin", "custom"],
          description: "Plateforme cible.",
        },
        text: {
          type: "string",
          description: "Caption / texte du post (TikTok caption, IG caption, tweet).",
        },
        media_url: {
          type: "string",
          description:
            "URL absolue du fichier média (image ou vidéo). Pour les vidéos locales, préfixer http://localhost:3001/media/ ou production URL.",
        },
        scheduled_at: {
          type: "string",
          description: "Date ISO 8601 pour publication différée (sinon immédiat).",
        },
      },
      required: ["channel", "text"],
    },
  },
  {
    name: "send_newsletter",
    description:
      "Envoie la newsletter hebdomadaire Soufi Studio via Resend. Format soigné " +
      "avec une citation centrale + lien vers l'épisode de la semaine. Utiliser à " +
      "la fin d'un cycle de production hebdomadaire pour récapituler le nouvel épisode.",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Objet de l'email." },
        citation: {
          type: "object",
          properties: {
            text: { type: "string" },
            author: { type: "string" },
            work: { type: "string" },
          },
          required: ["text", "author"],
          description: "Citation centrale qui ancre l'email.",
        },
        episode: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string" },
          },
          required: ["title", "url"],
          description: "Optionnel : épisode mis en avant avec CTA.",
        },
        intro: {
          type: "string",
          description: "Optionnel : court paragraphe d'introduction (max 300 chars).",
        },
      },
      required: ["subject", "citation"],
    },
  },
  {
    name: "transcribe_audio",
    description:
      "Transcrit un fichier audio MP3 avec Whisper et retourne le texte plein " +
      "+ les mots regroupés par paquets (default 3 mots) avec timestamps précis. " +
      "À utiliser après generate_audio pour générer des sous-titres burnt-in dans " +
      "les shorts (impact énorme : la majorité des utilisateurs TikTok/Reels regardent " +
      "muet). Passer le résultat 'groups' dans render_video → props.subtitles.",
    input_schema: {
      type: "object",
      properties: {
        audio_path: {
          type: "string",
          description:
            "Chemin local ou /media/xxx.mp3 (idéalement la valeur 'url' retournée par generate_audio).",
        },
        group_size: {
          type: "integer",
          minimum: 1,
          maximum: 8,
          description:
            "Mots par groupe de sous-titres (default 3). 2-3 = TikTok-style, 4-5 = lecture posée.",
        },
      },
      required: ["audio_path"],
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
      case "transcribe_audio":
        result = await transcribe(input as TranscribeInput);
        break;
      case "render_video":
        result = await renderVideo(input as RenderVideoInput);
        break;
      case "publish_youtube":
        result = await publishYoutube(input as PublishYouTubeInput);
        break;
      case "publish_social":
        result = await publishWebhook(input as PublishWebhookInput);
        break;
      case "send_newsletter":
        result = await sendNewsletter(input as SendNewsletterInput);
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
