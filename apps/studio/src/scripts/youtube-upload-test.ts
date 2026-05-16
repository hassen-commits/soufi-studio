/**
 * Upload de validation : pousse l'épisode Ghazâlî sur Passion_Coran
 * en mode UNLISTED (URL secrète, non listée dans les recherches ni l'onglet
 * de la chaîne). Permet de vérifier le rendu YouTube sans exposer publiquement.
 *
 * Usage : tsx src/scripts/youtube-upload-test.ts
 */
import { publishYoutube } from "../agent/handlers/publish-youtube.js";

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
  console.log("Upload UNLISTED en cours…");
  console.log("Titre :", TITLE);
  console.log("");

  const result = await publishYoutube({
    video_path: "/media/episode-sabr-ghazali.mp4",
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

  console.log("\n=== UPLOAD OK ===");
  console.log("Video ID    :", result.videoId);
  console.log("URL secrète :", result.url);
  console.log("Bytes       :", result.uploadedBytes.toLocaleString("fr-FR"));
  console.log("Privacy     :", result.privacy);
  console.log("");
  console.log("🔗 Ouvre l'URL pour vérifier le rendu (waveform, audio, titre).");
  console.log("   En unlisted, seuls ceux qui ont le lien peuvent voir la vidéo.");
}

main().catch((e) => {
  console.error("Erreur :", e instanceof Error ? e.message : e);
  process.exit(1);
});
