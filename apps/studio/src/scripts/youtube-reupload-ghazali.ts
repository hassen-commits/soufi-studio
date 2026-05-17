/**
 * Re-upload du Ghazâlî Sabr avec le fond cosmos (v2) sur Passion_Coran
 * en unlisted, puis update la row episodes en DB avec le nouvel youtube_id.
 *
 * Usage : tsx src/scripts/youtube-reupload-ghazali.ts
 */
import { createClient } from "@supabase/supabase-js";
import { publishYoutube } from "../agent/handlers/publish-youtube.js";
import { env } from "../env.js";

const SLUG = "ghazali-sabr-patience-coeur";
const VIDEO_PATH = "/media/episode-sabr-ghazali-cosmos.mp4";

const TITLE = "Le Sabr — La patience comme voie du cœur · Al-Ghazâlî";

const DESCRIPTION = `Capsule audio méditative sur le Sabr (الصبر) — la patience comme voie du cœur, d'après les enseignements d'Abû Hâmid al-Ghazâlî dans l'Ihyâ' 'Ulûm al-Dîn (Livre 32 : Kitâb al-sabr wa al-shukr).

Trois mouvements :
00:00 — Ouverture · le Sabr comme ancrage du cœur
00:30 — Les trois degrés de la patience selon Ghazâlî
02:30 — Patience, vision, amour : le triptyque de l'Ihyâ'

Citations scrupuleusement attribuées à al-Ghazâlî. Aucune invention.
Verset coranique cité : wa-Llâhu maʿa as-sâbirîn (Coran 2:153) via Ghazâlî.

—
Passion_Coran — Partager les vérités divines de la lettre coranique et la sagesse des grands maîtres soufis : Rûmî, Ibn ʿArabî, al-Ghazâlî, al-Tustarî.

#soufisme #ghazali #patience #sabr #spiritualité`;

async function main() {
  // 1. Upload
  console.log("Upload UNLISTED en cours…");
  const upload = await publishYoutube({
    video_path: VIDEO_PATH,
    title: TITLE,
    description: DESCRIPTION,
    privacy: "unlisted",
    tags: [
      "soufisme",
      "ghazali",
      "patience",
      "sabr",
      "spiritualité",
      "islam",
      "tradition islamique",
      "ihya",
      "français",
    ],
  });

  console.log("✅ Upload terminé");
  console.log("  Video ID :", upload.videoId);
  console.log("  URL      :", upload.url);
  console.log("  Bytes    :", upload.uploadedBytes.toLocaleString("fr-FR"));

  // 2. Update DB (admin pour bypasser RLS sur update)
  console.log("\nMise à jour DB episodes …");
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const { data, error } = await sb
    .from("episodes")
    .update({
      video_long_url: VIDEO_PATH,
      youtube_id: upload.videoId,
    })
    .eq("slug", SLUG)
    .select()
    .single();

  if (error) {
    console.error("Update DB échouée :", error);
    process.exit(1);
  }

  console.log("✅ DB mise à jour");
  console.log("  episode id    :", data.id);
  console.log("  video_long_url:", data.video_long_url);
  console.log("  youtube_id    :", data.youtube_id);
  console.log("");
  console.log("🔗 Vérifie sur :", upload.url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
