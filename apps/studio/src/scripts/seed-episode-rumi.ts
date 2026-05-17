/**
 * Upload du Rûmî Silence cosmos sur Passion_Coran en unlisted,
 * puis insertion (ou update) de la row episodes en DB. Idempotent :
 * si le slug existe déjà on fait un update, sinon insert.
 *
 * Usage : tsx src/scripts/seed-episode-rumi.ts
 */
import { createClient } from "@supabase/supabase-js";
import { publishYoutube } from "../agent/handlers/publish-youtube.js";
import { env } from "../env.js";

const SLUG = "rumi-silence-du-coeur";
const VIDEO_PATH = "/media/episode-rumi-silence-cosmos.mp4";
const AUDIO_PATH = "/media/2026-05-16-rumi-silence-coeur.mp3";

const TITLE = "Le silence du cœur · Jalâl al-Dîn Rûmî";

const DESCRIPTION = `Capsule audio méditative sur le silence intérieur dans la voie soufie — d'après l'enseignement de Jalâl al-Dîn Rûmî dans le Mathnawî.

Trois mouvements :
00:00 — Ouverture · la demeure que le bruit ne peut atteindre
00:30 — Cœur méditatif · le cœur comme Mer de Lumière
02:00 — Clôture · entendre les cent discours du Silence

« Ne parle pas, afin d'entendre des Orateurs ce qui n'a été ni dit ni fait. »
— Rûmî, Mathnawî.

—
Passion_Coran — Partager les vérités divines de la lettre coranique et la sagesse des grands maîtres soufis : Rûmî, Ibn ʿArabî, al-Ghazâlî, al-Tustarî.

#soufisme #rumi #silence #mathnawi #spiritualité`;

async function main() {
  console.log("Upload UNLISTED en cours…");
  const upload = await publishYoutube({
    video_path: VIDEO_PATH,
    title: TITLE,
    description: DESCRIPTION,
    privacy: "unlisted",
    tags: [
      "soufisme",
      "rûmî",
      "rumi",
      "silence",
      "mathnawi",
      "spiritualité",
      "islam",
      "tradition islamique",
      "français",
    ],
  });

  console.log("✅ Upload terminé");
  console.log("  Video ID :", upload.videoId);
  console.log("  URL      :", upload.url);
  console.log("  Bytes    :", upload.uploadedBytes.toLocaleString("fr-FR"));

  console.log("\nUpsert DB episodes…");
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  const { data: existing } = await sb
    .from("episodes")
    .select("id")
    .eq("slug", SLUG)
    .maybeSingle();

  const payload = {
    slug: SLUG,
    title: "Le silence du cœur",
    description: DESCRIPTION,
    mode: "podcast",
    status: "published",
    authors: ["rumi"],
    themes: ["silence"],
    citation_ids: [],
    audio_url: AUDIO_PATH,
    video_long_url: VIDEO_PATH,
    short_clip_urls: [],
    youtube_id: upload.videoId,
    duration_sec: 166,
    published_at: new Date().toISOString(),
  };

  const result = existing
    ? await sb.from("episodes").update(payload).eq("slug", SLUG).select().single()
    : await sb.from("episodes").insert(payload).select().single();

  if (result.error) {
    console.error("DB échec :", result.error);
    process.exit(1);
  }

  console.log(existing ? "✅ DB mise à jour" : "✅ Épisode inséré");
  console.log("  id         :", result.data.id);
  console.log("  slug       :", result.data.slug);
  console.log("  youtube_id :", result.data.youtube_id);
  console.log("");
  console.log("🔗 Vérifie :", upload.url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
