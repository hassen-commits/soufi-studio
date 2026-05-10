import type { AuthorKey, Maitre } from "./types";

export const AUTHOR_LABEL: Record<AuthorKey, string> = {
  rumi: "Rûmî",
  ibn_arabi: "Ibn ʿArabî",
  ghazali: "Al-Ghazâlî",
  tustari: "Sahl al-Tustarî",
  maitres_soufis: "Maîtres soufis",
};

// Valeur stockée dans metadata->>'author' en base (Supabase)
export const AUTHOR_DB_VALUE: Record<AuthorKey, string> = {
  rumi: "Rumi",
  ibn_arabi: "Ibn Arabi",
  ghazali: "Al-Ghazali",
  tustari: "Sahl al-Tustari",
  maitres_soufis: "Maîtres soufis",
};

// Inverse : DB value → AuthorKey (pour mapper les chunks)
export const AUTHOR_KEY_BY_DB: Record<string, AuthorKey> = Object.fromEntries(
  (Object.entries(AUTHOR_DB_VALUE) as [AuthorKey, string][]).map(([k, v]) => [v, k]),
);

export const MAITRES: Maitre[] = [
  {
    key: "rumi",
    name: "Rûmî",
    fullName: "Mawlânâ Jalâl ad-Dîn Rûmî",
    birth: 1207,
    death: 1273,
    origin: "Balkh — Konya",
    bio:
      "Poète mystique persan, fondateur de la voie mevlevie. Auteur du Mathnawî, " +
      "souvent appelé « le Coran en langue persane » par les soufis, il chante l'amour " +
      "divin comme seul chemin de retour à l'Origine.",
    works: [
      { title: "Mathnawî-ye Maʿnawî", titleFr: "Le Mathnawî", year: 1273 },
      { title: "Dîwân-e Shams-e Tabrîzî", titleFr: "Diwan de Shams" },
      { title: "Fîhi mâ fîhi", titleFr: "Le Livre du Dedans" },
    ],
  },
  {
    key: "ibn_arabi",
    name: "Ibn ʿArabî",
    fullName: "Muḥyî ad-Dîn Ibn ʿArabî",
    birth: 1165,
    death: 1240,
    origin: "Murcie — Damas",
    bio:
      "Cheikh al-Akbar, « le plus grand maître ». Métaphysicien de l'Unicité de l'Être " +
      "(waḥdat al-wujûd), il a laissé une œuvre encyclopédique qui irrigue encore " +
      "toute la pensée mystique islamique.",
    works: [
      { title: "Al-Futûḥât al-Makkiyya", titleFr: "Les Illuminations de La Mecque" },
      { title: "Fuṣûṣ al-Ḥikam", titleFr: "Les Chatons des Sagesses" },
    ],
  },
  {
    key: "ghazali",
    name: "Al-Ghazâlî",
    fullName: "Abû Ḥâmid Muḥammad al-Ghazâlî",
    birth: 1058,
    death: 1111,
    origin: "Tûs — Bagdad",
    bio:
      "Théologien, juriste, philosophe et soufi, il a réconcilié la science exotérique " +
      "et la voie mystique. L'Iḥyâʾ ʿulûm ad-dîn demeure l'un des sommets de la " +
      "spiritualité islamique.",
    works: [
      { title: "Iḥyâʾ ʿulûm ad-dîn", titleFr: "Revivification des sciences de la religion" },
      { title: "Mishkât al-Anwâr", titleFr: "Le Tabernacle des Lumières" },
      { title: "Al-Munqidh min aḍ-Ḍalâl", titleFr: "Erreur et délivrance" },
    ],
  },
  {
    key: "tustari",
    name: "Sahl al-Tustarî",
    fullName: "Sahl ibn ʿAbd Allâh al-Tustarî",
    birth: 818,
    death: 896,
    origin: "Tustar (Perse)",
    bio:
      "Maître précoce du soufisme et l'un des premiers exégètes ésotériques du Coran. " +
      "Son Tafsîr fonde la lecture intérieure (bâṭinî) du Texte sacré.",
    works: [
      { title: "Tafsîr al-Tustarî", titleFr: "Commentaire ésotérique du Coran" },
    ],
  },
  {
    key: "maitres_soufis",
    name: "Maîtres soufis",
    fullName: "Florilège de la tradition soufie",
    origin: "Tradition islamique",
    bio:
      "Sentences, prières et enseignements rassemblés des grands maîtres : Junayd, " +
      "Bistâmî, Râbiʿa al-ʿAdawiyya, Hallâj, ʿAbd al-Qâdir al-Jîlânî, et bien d'autres.",
    works: [],
  },
];

export const MAITRE_BY_KEY = Object.fromEntries(
  MAITRES.map((m) => [m.key, m]),
) as Record<AuthorKey, Maitre>;
