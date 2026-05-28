export type AuthorKey =
  | "rumi"
  | "ibn_arabi"
  | "ghazali"
  | "tustari"
  | "maitres_soufis";

export type Language = "fr" | "en" | "ar";

export type Tradition = "soufisme" | "tafsir_esoterique" | "poesie_mystique";

export interface ChunkMetadata {
  author: AuthorKey | string;
  work?: string;
  work_fr?: string;
  language?: Language;
  tradition?: Tradition;
  translate_to?: Language;
  citation_allowed?: boolean;
  source_url?: string;
  page?: number;
  theme?: string[];
}

export interface Chunk {
  id: number | string;
  content: string;
  /**
   * Traduction française du `content` quand l'original est dans une autre
   * langue. Populée par les scripts de traduction (ex. translate-tustari-chunks).
   * Si présent, c'est ce texte qui doit être affiché sur le site.
   */
  content_fr?: string | null;
  metadata: ChunkMetadata;
  embedding?: number[];
  created_at?: string;
}

export interface Citation {
  id: string;
  slug: string;
  author: AuthorKey | string;
  authorLabel: string;
  work?: string;
  workFr?: string;
  language: Language;
  text: string;
  textFr?: string;
  themes?: string[];
  source?: string;
}

export interface Maitre {
  key: AuthorKey;
  name: string;
  fullName: string;
  birth?: number;
  death?: number;
  origin: string;
  /** Bio courte (1 paragraphe) pour les cartes et l'OG. */
  bio: string;
  /**
   * Bio longue, prose libre. Les paragraphes sont séparés par une ligne vide
   * (\n\n). Optionnel : si absent, on retombe sur `bio`.
   */
  bioLong?: string;
  works: { title: string; titleFr?: string; year?: number }[];
  /**
   * Bibliographie secondaire : éditions critiques, traductions, monographies
   * académiques recommandées. Pour orienter le lecteur vers les sources.
   */
  bibliography?: {
    author: string;
    title: string;
    publisher?: string;
    year?: number;
    lang?: "fr" | "en" | "ar";
    note?: string;
  }[];
  imageUrl?: string;
  citationCount?: number;
}

export type EpisodeMode = "podcast" | "youtube_script" | "compare" | "chat";
export type EpisodeStatus = "draft" | "audio_ready" | "video_ready" | "published";

export interface Episode {
  id: string;
  slug: string;
  title: string;
  description: string;
  mode: EpisodeMode;
  status: EpisodeStatus;
  authors: AuthorKey[];
  themes: string[];
  citations: string[];
  scriptMd?: string;
  audioUrl?: string;
  videoLongUrl?: string;
  shortClipUrls?: string[];
  youtubeId?: string;
  publishedAt?: string;
  createdAt: string;
  durationSec?: number;
}
