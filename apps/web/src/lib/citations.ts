const INTERNAL_WORK_NAMES: Record<string, string> = {
  ibnarabi_fusus_al_hikam_fr: "Les Chatons des sagesses (Fuṣūṣ al-ḥikam)",
  rumi_mathnawi_fr: "Le Mathnawî",
  al_jazairi_livre_des_haltes_t1_fr: "Le Livre des Haltes, tome I",
  "418525136-Mathnawi-T-1-a-3-Rumi-Djalal-Din": "Le Mathnawî, livres I à III",
};

export function cleanCitationText(text: string): string {
  return text
    .replace(/\t+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\s+([,.;:!?»])/g, "$1")
    .trim();
}

export function formatWorkTitle(work?: string): string | undefined {
  if (!work) return undefined;
  if (INTERNAL_WORK_NAMES[work]) return INTERNAL_WORK_NAMES[work];

  const looksInternal = /[_]|^\d{6,}|\.(pdf|docx?)$/i.test(work);
  if (!looksInternal) return work;

  return work
    .replace(/\.(pdf|docx?)$/i, "")
    .replace(/^\d+-?/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\bfr\b$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

