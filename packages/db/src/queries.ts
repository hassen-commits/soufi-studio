import {
  AUTHOR_LABEL,
  citationSlug,
  type AuthorKey,
  type Chunk,
  type Citation,
} from "@soufi/content";
import { getSupabase } from "./client";

const TABLE = "chunks";

function chunkToCitation(c: Chunk): Citation {
  const author = (c.metadata?.author ?? "maitres_soufis") as AuthorKey;
  const lang = (c.metadata?.language ?? "fr") as Citation["language"];
  return {
    id: String(c.id),
    slug: citationSlug(c.content),
    author,
    authorLabel: AUTHOR_LABEL[author] ?? String(author),
    work: c.metadata?.work,
    workFr: c.metadata?.work_fr,
    language: lang,
    text: c.content,
    themes: c.metadata?.theme,
  };
}

export async function listCitations(opts?: {
  author?: AuthorKey;
  limit?: number;
  offset?: number;
}): Promise<Citation[]> {
  const supabase = getSupabase();
  const limit = opts?.limit ?? 24;
  const offset = opts?.offset ?? 0;

  let query = supabase
    .from(TABLE)
    .select("id, content, metadata, created_at")
    .range(offset, offset + limit - 1)
    .order("id", { ascending: true });

  if (opts?.author) {
    query = query.eq("metadata->>author", opts.author);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => chunkToCitation(row as Chunk));
}

export async function countCitationsByAuthor(): Promise<Record<string, number>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("metadata->author");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const a = (row as { author?: string }).author ?? "maitres_soufis";
    counts[a] = (counts[a] ?? 0) + 1;
  }
  return counts;
}

export async function getRandomCitations(n = 6): Promise<Citation[]> {
  const supabase = getSupabase();
  const { count } = await supabase.from(TABLE).select("*", { count: "exact", head: true });
  if (!count) return [];
  const offset = Math.floor(Math.random() * Math.max(0, count - n));
  return listCitations({ limit: n, offset });
}
