/**
 * Seed l'épisode Ghazâlî (Sabr) dans la table `episodes` afin qu'il apparaisse
 * sur le site /episodes. Idempotent : ne fait rien si le slug existe déjà.
 */
import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

const SLUG = "ghazali-sabr-patience-coeur";

async function main() {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const { data: existing } = await sb
    .from("episodes")
    .select("id, slug, status, published_at")
    .eq("slug", SLUG)
    .maybeSingle();

  if (existing) {
    console.log("Épisode déjà présent :", existing);
    console.log("→ Pas d'insertion. Pour mettre à jour, exécute manuellement.");
    return;
  }

  const row = {
    slug: SLUG,
    title: "Le Sabr — La patience comme voie du cœur",
    description:
      "Capsule audio méditative sur le Sabr (الصبر) d'après les enseignements d'Abû Hâmid al-Ghazâlî " +
      "dans l'Ihyâ' 'Ulûm al-Dîn (Livre 32 : Kitâb al-sabr wa al-shukr). Trois mouvements : " +
      "ancrage du cœur, les trois degrés de la patience, et le triptyque patience–vision–amour.",
    mode: "podcast",
    status: "published",
    authors: ["ghazali"],
    themes: ["patience"],
    citation_ids: [],
    audio_url: "/media/2026-05-16-ghazali-sabr-patience.mp3",
    video_long_url: "/media/episode-sabr-ghazali.mp4",
    short_clip_urls: [],
    youtube_id: "VbuHK3izQPI",
    duration_sec: 186,
    published_at: new Date().toISOString(),
  };

  const { data, error } = await sb.from("episodes").insert(row).select().single();
  if (error) {
    console.error("Insertion échouée :", error);
    process.exit(1);
  }

  console.log("✅ Épisode inséré");
  console.log("  id      :", data.id);
  console.log("  slug    :", data.slug);
  console.log("  status  :", data.status);
  console.log("  youtube :", `https://www.youtube.com/watch?v=${data.youtube_id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
