import {
  AUTHOR_DB_VALUE,
  AUTHOR_KEY_BY_DB,
  AUTHOR_LABEL,
  citationSlug,
  type AuthorKey,
  type Chunk,
  type Citation,
} from "@soufi/content";
import { getSupabase } from "./client";

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

export async function getRandomCitations(n = 6): Promise<Citation[]> {
  const supabase = getSupabase();
  const { count } = await supabase.from(TABLE).select("id", { count: "exact", head: true });
  if (!count) return [];
  const offset = Math.floor(Math.random() * Math.max(0, count - n));
  return listCitations({ limit: n, offset });
}
