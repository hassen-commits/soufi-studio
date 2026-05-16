import {
  AUTHOR_DB_VALUE,
  AUTHOR_KEY_BY_DB,
  AUTHOR_LABEL,
  citationSlug,
  type AuthorKey,
  type Chunk,
  type Citation,
} from "@soufi/content";
import { getSupabase, getSupabaseAdmin } from "./client";

export type EpisodeStatus =
  | "planned"
  | "script_ready"
  | "audio_ready"
  | "video_ready"
  | "published"
  | "failed";

export interface EpisodeRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  mode: string;
  status: EpisodeStatus;
  authors: string[] | null;
  themes: string[] | null;
  audio_url: string | null;
  video_long_url: string | null;
  short_clip_urls: string[] | null;
  youtube_id: string | null;
  duration_sec: number | null;
  published_at: string | null;
  created_at: string;
}

const TABLE = "chunks";

function chunkToCitation(c: Chunk): Citation {
  const dbAuthor = String(c.metadata?.author ?? "Maîtres soufis");
  const author = (AUTHOR_KEY_BY_DB[dbAuthor] ?? "maitres_soufis") as AuthorKey;
  const lang = (c.metadata?.language ?? "fr") as Citation["language"];
  return {
    id: String(c.id),
    slug: citationSlug(c.content),
    author,
    authorLabel: AUTHOR_LABEL[author] ?? dbAuthor,
    work: c.metadata?.work,
    workFr: c.metadata?.work_fr,
    language: lang,
    text: c.content,
    themes: c.metadata?.theme,
  };
}

const MAIN_AUTHORS_DB = ["Rumi", "Ibn Arabi", "Al-Ghazali", "Sahl al-Tustari"] as const;

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
    .select("id, content, metadata")
    .range(offset, offset + limit - 1)
    .order("id", { ascending: true });

  if (opts?.author === "maitres_soufis") {
    // catégorie fourre-tout : tout ce qui n'est pas un des 4 grands maîtres
    query = query.not(
      "metadata->>author",
      "in",
      `(${MAIN_AUTHORS_DB.map((a) => `"${a}"`).join(",")})`,
    );
  } else if (opts?.author) {
    const dbValue = AUTHOR_DB_VALUE[opts.author];
    if (dbValue) query = query.eq("metadata->>author", dbValue);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => chunkToCitation(row as Chunk));
}

export async function countCitationsByAuthor(): Promise<Record<AuthorKey, number>> {
  const supabase = getSupabase();
  const counts = {} as Record<AuthorKey, number>;

  await Promise.all([
    ...(Object.entries(AUTHOR_DB_VALUE) as [AuthorKey, string][])
      .filter(([key]) => key !== "maitres_soufis")
      .map(async ([key, dbValue]) => {
        const { count } = await supabase
          .from(TABLE)
          .select("id", { count: "exact", head: true })
          .eq("metadata->>author", dbValue);
        counts[key] = count ?? 0;
      }),
    (async () => {
      const { count } = await supabase
        .from(TABLE)
        .select("id", { count: "exact", head: true })
        .not(
          "metadata->>author",
          "in",
          `(${MAIN_AUTHORS_DB.map((a) => `"${a}"`).join(",")})`,
        );
      counts.maitres_soufis = count ?? 0;
    })(),
  ]);

  return counts;
}

// Découverte par thème — le corpus n'ayant pas de tags `metadata.theme`,
// on s'appuie sur un OR de `content ilike '%keyword%'`. Imparfait (faux positifs
// possibles, dépend du vocabulaire FR/translit) mais suffisant pour une page
// de découverte. À remplacer par pgvector + embedding du thème plus tard.
function themeOrClause(keywords: string[]): string {
  return keywords
    .map((k) => `content.ilike.%${k.replace(/[%,]/g, "")}%`)
    .join(",");
}

export async function listCitationsByTheme(
  keywords: string[],
  opts?: { limit?: number; offset?: number },
): Promise<Citation[]> {
  if (keywords.length === 0) return [];
  const supabase = getSupabase();
  const limit = opts?.limit ?? 24;
  const offset = opts?.offset ?? 0;

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, content, metadata")
    .or(themeOrClause(keywords))
    .range(offset, offset + limit - 1)
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => chunkToCitation(row as Chunk));
}

export async function countCitationsByTheme(keywords: string[]): Promise<number> {
  if (keywords.length === 0) return 0;
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .or(themeOrClause(keywords));
  if (error) throw error;
  return count ?? 0;
}

// Sequential — Supabase timeout quand plusieurs counts `ilike OR` partent en
// parallèle. Avec `revalidate=3600` côté Next, ce coût est payé 1× par heure.
export async function countCitationsByThemeMap(
  themes: Array<{ slug: string; keywords: string[] }>,
): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  for (const t of themes) {
    try {
      out[t.slug] = await countCitationsByTheme(t.keywords);
    } catch {
      out[t.slug] = null;
    }
  }
  return out;
}

export async function getRandomCitations(n = 6): Promise<Citation[]> {
  const supabase = getSupabase();
  const { count } = await supabase.from(TABLE).select("id", { count: "exact", head: true });
  if (!count) return [];
  const offset = Math.floor(Math.random() * Math.max(0, count - n));
  return listCitations({ limit: n, offset });
}

// ============================================================
// Episodes — queries publiques (anon, RLS limite à status=published)
// ============================================================

export async function listPublishedEpisodes(opts?: {
  limit?: number;
}): Promise<EpisodeRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("episodes")
    .select("*")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (error) throw error;
  return (data ?? []) as EpisodeRow[];
}

export async function getPublishedEpisode(slug: string): Promise<EpisodeRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("episodes")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data as EpisodeRow) ?? null;
}

// ============================================================
// Episodes — queries admin (utilisent service_role pour bypass RLS)
// ============================================================

export async function adminListEpisodes(opts?: {
  status?: EpisodeStatus;
  limit?: number;
}): Promise<EpisodeRow[]> {
  const sb = getSupabaseAdmin();
  let q = sb
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EpisodeRow[];
}

export async function adminCountEpisodesByStatus(): Promise<Record<EpisodeStatus, number>> {
  const sb = getSupabaseAdmin();
  const statuses: EpisodeStatus[] = [
    "planned",
    "script_ready",
    "audio_ready",
    "video_ready",
    "published",
    "failed",
  ];
  const counts = {} as Record<EpisodeStatus, number>;
  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await sb
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = count ?? 0;
    }),
  );
  return counts;
}
