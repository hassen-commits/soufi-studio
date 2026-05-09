import { embed } from "../../lib/openai.js";
import { supabase } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

export interface RagSearchInput {
  query: string;
  author?: string;
  limit?: number;
  similarity_threshold?: number;
}

export interface RagHit {
  id: number;
  content: string;
  author: string;
  work?: string;
  language?: string;
  similarity: number;
}

const AUTHOR_ALIASES: Record<string, string> = {
  rumi: "Rumi",
  rûmî: "Rumi",
  ibn_arabi: "Ibn Arabi",
  "ibn arabi": "Ibn Arabi",
  ghazali: "Al-Ghazali",
  ghazâlî: "Al-Ghazali",
  "al-ghazali": "Al-Ghazali",
  tustari: "Sahl al-Tustari",
  tustarî: "Sahl al-Tustari",
  "sahl al-tustari": "Sahl al-Tustari",
  maitres_soufis: "Maîtres soufis",
  "maîtres soufis": "Maîtres soufis",
};

function normalizeAuthor(author?: string): string | undefined {
  if (!author) return undefined;
  return AUTHOR_ALIASES[author.toLowerCase()] ?? author;
}

interface MatchChunkRow {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function ragSearch(input: RagSearchInput): Promise<RagHit[]> {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);
  const filterAuthor = normalizeAuthor(input.author);

  logger.info({ query: input.query, author: filterAuthor, limit }, "rag_search");

  const queryEmbedding = await embed(input.query);

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: limit,
    filter_author: filterAuthor ?? null,
    similarity_threshold: input.similarity_threshold ?? 0.0,
  });

  if (error) {
    logger.error({ error }, "rag_search RPC error");
    throw new Error(`Supabase match_chunks: ${error.message}`);
  }

  const rows = (data ?? []) as MatchChunkRow[];
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    author: String(row.metadata?.author ?? "inconnu"),
    work: row.metadata?.work as string | undefined,
    language: row.metadata?.language as string | undefined,
    similarity: row.similarity,
  }));
}
