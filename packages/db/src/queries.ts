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
  const originalLang = (c.metadata?.language ?? "fr") as Citation["language"];
  // Si content_fr est renseigné, on l'affiche en priorité (texte original
  // anglais ou arabe traduit en français pour le site).
  const displayText = c.content_fr && c.content_fr.trim().length > 0 ? c.content_fr : c.content;
  const displayLang: Citation["language"] =
    c.content_fr && c.content_fr.trim().length > 0 ? "fr" : originalLang;
  return {
    id: String(c.id),
    slug: citationSlug(displayText),
    author,
    authorLabel: AUTHOR_LABEL[author] ?? dbAuthor,
    work: c.metadata?.work,
    workFr: c.metadata?.work_fr,
    language: displayLang,
    text: displayText,
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
    .select("id, content, content_fr, metadata")
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

/**
 * Liste publique nettoyée. La pagination porte sur les citations qui passent
 * le contrôle éditorial, et non sur les lignes brutes issues des PDF.
 */
export async function listQuotableCitations(opts?: {
  author?: AuthorKey;
  limit?: number;
  offset?: number;
}): Promise<Citation[]> {
  const supabase = getSupabase();
  const limit = opts?.limit ?? 24;
  const offset = opts?.offset ?? 0;
  const needed = offset + limit;
  const batchSize = 500;
  const selected: Citation[] = [];
  const seenSlugs = new Set<string>();
  let rawOffset = 0;

  while (selected.length < needed) {
    let query = supabase
      .from(TABLE)
      .select("id, content, content_fr, metadata")
      .range(rawOffset, rawOffset + batchSize - 1)
      .order("id", { ascending: true });

    if (opts?.author === "maitres_soufis") {
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

    const rows = data ?? [];
    for (const row of rows) {
      const citation = chunkToCitation(row as Chunk);
      const uniqueKey = `${citation.author}:${citation.slug}`;
      if (
        citation.language === "fr" &&
        isQuotable(citation.text) &&
        !seenSlugs.has(uniqueKey)
      ) {
        seenSlugs.add(uniqueKey);
        selected.push(citation);
      }
    }

    if (rows.length < batchSize) break;
    rawOffset += batchSize;
  }

  return selected.slice(offset, needed);
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
    .select("id, content, content_fr, metadata")
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

export async function searchCitations(
  query: string,
  opts?: { limit?: number; offset?: number },
): Promise<Citation[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = getSupabase();
  const limit = opts?.limit ?? 24;
  const offset = opts?.offset ?? 0;
  const safe = q.replace(/[%,]/g, "");
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, content, content_fr, metadata")
    .ilike("content", `%${safe}%`)
    .range(offset, offset + limit - 1)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => chunkToCitation(row as Chunk));
}

export async function countCitationsMatching(query: string): Promise<number> {
  const q = query.trim();
  if (q.length < 2) return 0;
  const supabase = getSupabase();
  const safe = q.replace(/[%,]/g, "");
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .ilike("content", `%${safe}%`);
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

/**
 * Heuristique "citation publiable" : on rejette tout chunk qui ressemble
 * à un fragment d'extraction PDF (commence/finit mid-phrase, numéros de
 * page, puces, mots coupés). Le corpus est issu de scans PDF donc beaucoup
 * de chunks sont des passages bruts non-conclusifs.
 */
export function isQuotable(text: string): boolean {
  const t = text.trim();
  const len = t.length;
  if (len < 100 || len > 420) return false;
  // Doit commencer par une majuscule ou un guillemet ouvrant — pas de mid-mot.
  if (!/^[A-ZÀÂÉÈÊÎÔÙÇ«"„''(]/.test(t)) return false;
  // Doit finir par une ponctuation de fin de phrase ou un guillemet fermant.
  if (!/[.!?…»"']$/.test(t)) return false;
  // Numéros (refs de page, notes de bas de page) — souvent des fragments scolaires.
  if (/\b\d{1,4}\b/.test(t)) return false;
  // Puces / séparateurs typographiques.
  if (/[•●▪◦►▶◀※•·*]/.test(t)) return false;
  // Éléments éditoriaux du livre, pages de titre et notices bibliographiques.
  if (
    /^(avertissement|avant-propos|préface|introduction|bibliographie|table des matières|notice|glossaire)\b/i.test(t) ||
    /\b(traduction,? notes et commentaire|tome (premier|second|i{1,3}|iv))\b/i.test(t) ||
    /\b(éditeur|édition|isbn|copyright|tous droits réservés)\b/i.test(t)
  ) return false;
  // Détecte les mots cassés par OCR : trop de "mots" de 1-2 caractères qui
  // ne sont pas des mots fonctionnels français courants.
  const stopShort = new Set([
    "à", "a", "y", "et", "le", "la", "de", "du", "un", "il", "en", "au",
    "ce", "se", "te", "me", "ne", "on", "ou", "si", "sa", "ta", "ma", "tu",
    "ai", "as", "es", "an", "ô", "ne", "ce", "où", "là",
  ]);
  const words = t.toLowerCase().split(/\s+/);
  const orphans = words.filter(
    (w) => w.length > 0 && w.length <= 2 && !stopShort.has(w.replace(/[^a-zà-ÿ]/gi, "")),
  );
  if (orphans.length > 1) return false;
  return true;
}

/**
 * Citation du jour — déterministe par date : tout le monde voit la même
 * citation le même jour. Rotation linéaire sur les chunks qui passent le
 * filtre `isQuotable` (phrase complète, propre, sans artefact PDF).
 */
export async function getCitationOfTheDay(date?: Date): Promise<Citation | null> {
  const supabase = getSupabase();
  const { data: pool, error: poolErr } = await supabase
    .from(TABLE)
    .select("id, content, content_fr, metadata")
    .order("id", { ascending: true });
  if (poolErr) throw poolErr;
  const quotable = (pool ?? []).filter((row) =>
    isQuotable(String((row as Chunk).content ?? "")),
  );
  if (quotable.length === 0) return null;

  const d = date ?? new Date();
  const epoch = Date.UTC(2024, 0, 1);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const daysSince = Math.floor((today - epoch) / 86400000);
  const idx = ((daysSince % quotable.length) + quotable.length) % quotable.length;

  return chunkToCitation(quotable[idx] as Chunk);
}

export async function getRandomCitations(n = 6): Promise<Citation[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, content, content_fr, metadata");
  if (error) throw error;

  const pool = (data ?? [])
    .map((row) => chunkToCitation(row as Chunk))
    .filter((citation) => citation.language === "fr" && isQuotable(citation.text));

  for (let i = 0; i < Math.min(n, pool.length); i += 1) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    const current = pool[i];
    const replacement = pool[j];
    if (current && replacement) {
      pool[i] = replacement;
      pool[j] = current;
    }
  }
  return pool.slice(0, n);
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
