export interface ThemeConfig {
  slug: string;
  title: string;
  desc: string;
  longDesc: string;
  keywords: string[];
  epigraph?: { text: string; author: string };
}

// Les keywords sont matchés en `ilike '%kw%'` sur le contenu (case-insensitive).
// Le corpus n'ayant pas de tags thématiques en métadonnée, on s'appuie sur
// la présence du mot — imparfait mais suffisant pour une découverte par thème.
export const THEMES: ThemeConfig[] = [
  {
    slug: "amour-divin",
    title: "L'Amour divin",
    desc: "Le souffle qui meut toute chose.",
    longDesc:
      "Dans le soufisme, l'amour (maḥabba, ʿishq) n'est pas un sentiment parmi d'autres : " +
      "c'est la force première par laquelle Dieu se déploie et par laquelle l'être retourne " +
      "vers son Origine. Rûmî en a fait le centre de son Mathnawî ; Ibn ʿArabî en a fait la " +
      "racine de toute manifestation.",
    keywords: ["amour", "aimé", "aimer", "aimant", "mahabba", "bien-aimé"],
    epigraph: {
      text: "Je suis le serviteur du Coran tant que j'ai souffle. Je suis poussière sur la voie de Muhammad.",
      author: "Rûmî",
    },
  },
  {
    slug: "tawhid",
    title: "Le Tawḥîd",
    desc: "L'unicité au cœur de la quête.",
    longDesc:
      "Le tawḥîd — affirmation que Dieu est Un — est à la fois le premier mot de la " +
      "Profession de foi et l'horizon ultime du chemin spirituel. Pour les maîtres soufis, " +
      "le réaliser n'est pas savoir une doctrine : c'est s'effacer pour que ne demeure que Lui.",
    keywords: ["unicité", "l'Un", "l'Unique", "unifie", "tawḥîd", "tawhid", "unique"],
    epigraph: {
      text: "Il était, et rien n'était avec Lui. Il est maintenant tel qu'Il était.",
      author: "Hadith (tradition soufie)",
    },
  },
  {
    slug: "patience",
    title: "La patience",
    desc: "La voie longue et certaine.",
    longDesc:
      "Le ṣabr — patience, constance, endurance — est dans l'Ihyâ' de Ghazâlî un livre " +
      "entier (livre 32 : Kitâb al-ṣabr wa al-shukr). C'est la vertu cardinale de celui " +
      "qui ne fuit ni l'épreuve ni la promesse, et qui sait que Dieu est avec les patients " +
      "(Coran 2:153).",
    keywords: ["patience", "patient", "endurer", "endurance", "sabr", "ṣabr"],
    epigraph: { text: "La patience est la clé du soulagement.", author: "Tradition soufie" },
  },
  {
    slug: "silence",
    title: "Le silence",
    desc: "Là où l'âme entend.",
    longDesc:
      "Pour les maîtres, parler trop ferme l'oreille du cœur. Le silence — taʿarruf, " +
      "ṣamt — n'est pas l'absence de parole mais l'espace dans lequel la Parole véritable " +
      "peut résonner. Rûmî : « Ne parle pas, afin d'entendre des Orateurs ce qui n'a été " +
      "ni dit ni fait. »",
    keywords: ["silence", "taire", "se taire", "muet", "tais"],
    epigraph: {
      text: "Ne parle pas, afin d'entendre des Orateurs ce qui n'a été ni dit ni fait.",
      author: "Rûmî, Mathnawî",
    },
  },
  {
    slug: "voyage",
    title: "Le voyage intérieur",
    desc: "La marche du cœur vers l'Origine.",
    longDesc:
      "Le sulûk — la marche du voyageur (sâlik) — est la métaphore centrale du soufisme : " +
      "la vie spirituelle est un retour, une remontée vers la Source. Ce voyage n'est pas " +
      "horizontal mais vertical : il se fait à l'intérieur, à travers les stations (maqâmât) " +
      "et les états (aḥwâl).",
    keywords: ["voyage", "voyageur", "chemin", "voie", "sentier", "retour", "marche"],
    epigraph: {
      text: "Le chemin est en toi, non hors de toi. Marche.",
      author: "Tradition soufie",
    },
  },
  {
    slug: "lumiere",
    title: "La Lumière",
    desc: "Mishkât al-Anwâr.",
    longDesc:
      "« Dieu est la Lumière des cieux et de la terre » (Coran 24:35). Ce verset, " +
      "appelé Verset de la Lumière, est commenté par Ghazâlî dans le Mishkât al-Anwâr — " +
      "Le Tabernacle des Lumières. Pour les soufis, la lumière n'est ni métaphore ni image : " +
      "c'est ce par quoi tout est vu, c'est l'éclat même de l'Être.",
    keywords: ["lumière", "lumineux", "éclat", "illumin", "clarté", "rayonne", "nûr"],
    epigraph: {
      text: "Lumière sur Lumière. Dieu guide vers Sa lumière qui Il veut.",
      author: "Coran 24:35",
    },
  },
];

export function getTheme(slug: string): ThemeConfig | undefined {
  return THEMES.find((t) => t.slug === slug);
}
