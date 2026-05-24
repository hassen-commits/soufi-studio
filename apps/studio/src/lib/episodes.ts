import { supabase } from "./supabase.js";

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
  citation_ids: number[] | null;
  script_md: string | null;
  audio_url: string | null;
  video_long_url: string | null;
  short_clip_urls: string[] | null;
  youtube_id: string | null;
  duration_sec: number | null;
  published_at: string | null;
  created_at: string;
}

export async function listEpisodes(opts?: {
  status?: EpisodeStatus;
  limit?: number;
}): Promise<EpisodeRow[]> {
  let q = supabase
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EpisodeRow[];
}

export async function findNextPlanned(): Promise<EpisodeRow | null> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("status", "planned")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as EpisodeRow | undefined) ?? null;
}

export async function findReadyToPublish(): Promise<EpisodeRow | null> {
  // Filtre `youtube_id IS NULL` pour éviter de re-uploader un épisode déjà
  // poussé sur YouTube. Le statut reste "video_ready" après upload jusqu'à
  // ce que l'humain bascule en public via /admin/episodes/:id/privacy.
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("status", "video_ready")
    .is("youtube_id", null)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as EpisodeRow | undefined) ?? null;
}

export async function getEpisode(id: string): Promise<EpisodeRow | null> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as EpisodeRow) ?? null;
}

export async function createPlannedEpisode(input: {
  slug: string;
  title: string;
  description?: string;
  themeFr?: string;
  author?: string;
}): Promise<EpisodeRow> {
  const row = {
    slug: input.slug,
    title: input.title,
    description: input.description ?? null,
    mode: "podcast",
    status: "planned" as const,
    authors: input.author ? [input.author] : [],
    themes: input.themeFr ? [input.themeFr] : [],
    citation_ids: [],
    short_clip_urls: [],
  };
  const { data, error } = await supabase
    .from("episodes")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as EpisodeRow;
}

export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await supabase.from("episodes").delete().eq("id", id);
  if (error) throw error;
}

export async function updateEpisode(
  id: string,
  patch: Partial<EpisodeRow>,
): Promise<EpisodeRow> {
  const { data, error } = await supabase
    .from("episodes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as EpisodeRow;
}

export async function countEpisodesByStatus(): Promise<Record<EpisodeStatus, number>> {
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
      const { count } = await supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = count ?? 0;
    }),
  );
  return counts;
}
