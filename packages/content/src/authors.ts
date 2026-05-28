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
    bioLong: `Né en 1207 à Balkh, dans l'actuel Afghanistan, Jalâl ad-Dîn Rûmî suit son père sur les routes de l'exil mongol qui mèneront sa famille jusqu'à Konya, en Anatolie. Il y deviendra un docteur de la Loi respecté avant que sa vie ne bascule, à quarante-cinq ans, en la rencontre d'un derviche errant : Shams al-Dîn de Tabrîz.

Cette rencontre est un foudroiement. De cet amour spirituel naît une œuvre poétique sans équivalent dans l'histoire de l'Islam — le Dîwân-e Shams, qui porte le nom de l'ami disparu, et le Mathnawî-ye Maʿnawî, immense fresque de quelque 25 000 vers que les soufis nomment « le Coran en langue persane ».

Rûmî enseigne que toute chose existe par l'amour, et qu'elle retourne à Dieu par lui. La quête n'est pas un voyage vers un ailleurs mais une remontée vers la Source, comme la flûte de roseau qui pleure d'avoir été coupée du roseau-mère. « Écoute ce roseau, comme il se plaint », commence le Mathnawî — et tout le livre est ce gémissement-là, devenu chant.

Après sa mort en 1273, ses disciples fondent l'ordre des derviches tourneurs, la voie mevlevie, qui fait de la danse cosmique le rituel central : tourner en silence, paume droite tournée vers le ciel et paume gauche vers la terre, c'est devenir le passage où le don divin descend dans le monde.`,
    works: [
      { title: "Mathnawî-ye Maʿnawî", titleFr: "Le Mathnawî", year: 1273 },
      { title: "Dîwân-e Shams-e Tabrîzî", titleFr: "Diwan de Shams" },
      { title: "Fîhi mâ fîhi", titleFr: "Le Livre du Dedans" },
    ],
    bibliography: [
      {
        author: "Eva de Vitray-Meyerovitch (trad.)",
        title: "Mathnawî, la quête de l'absolu",
        publisher: "Éditions du Rocher",
        year: 1990,
        lang: "fr",
        note: "Traduction française intégrale du Mathnawî, en 2 volumes. La référence francophone, due à la grande traductrice de Rûmî au XXᵉ siècle.",
      },
      {
        author: "Eva de Vitray-Meyerovitch (trad.)",
        title: "Le Livre du Dedans (Fîhi mâ fîhi)",
        publisher: "Albin Michel — Spiritualités vivantes",
        year: 1976,
        lang: "fr",
        note: "Les entretiens spirituels recueillis par les disciples. Plus accessible que le Mathnawî pour entrer dans l'univers de Rûmî.",
      },
      {
        author: "Eva de Vitray-Meyerovitch & Djamchid Mortazavi (trad.)",
        title: "Odes mystiques (Dîwân-e Shams)",
        publisher: "Klincksieck",
        year: 1973,
        lang: "fr",
        note: "Anthologie traduite du Dîwân : la part lyrique et flamboyante de l'œuvre, écrite après la rencontre avec Shams.",
      },
      {
        author: "William C. Chittick",
        title: "The Sufi Path of Love: The Spiritual Teachings of Rumi",
        publisher: "SUNY Press",
        year: 1983,
        lang: "en",
        note: "L'étude académique de référence en anglais : Chittick organise la pensée de Rûmî autour de l'amour comme principe métaphysique.",
      },
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
    bioLong: `Né en 1165 à Murcie, dans l'Espagne musulmane, Muḥyî ad-Dîn Ibn ʿArabî traverse au cours de sa vie tout le monde de l'Islam classique : al-Andalus, le Maghreb, l'Égypte, l'Arabie, l'Anatolie, la Syrie. À chaque étape il rencontre, enseigne, écrit. À sa mort à Damas en 1240, il laisse plus de trois cents ouvrages — dont les Futûḥât al-Makkiyya, somme de mille pages écrite à La Mecque, et les Fuṣûṣ al-Ḥikam, condensé de sa doctrine donné par le Prophète en vision.

La tradition lui donne le titre de Cheikh al-Akbar, « le plus grand maître ». Sa pensée centrale, la waḥdat al-wujûd — Unicité de l'Être —, affirme qu'il n'y a, à proprement parler, qu'un seul Existant : Dieu. Le monde n'est pas autre que Lui ; il est Sa manifestation, Son auto-dévoilement (tajallî), Son miroir.

Cette métaphysique n'est pas spéculation abstraite. Elle est expérience vécue, donnée dans le dévoilement (kashf) qui suit la purification du cœur. Pour Ibn ʿArabî, l'homme accompli (al-insân al-kâmil) est celui par qui Dieu Se connaît Lui-même : le saint authentique réalise dans son existence ce que la création tout entière annonce.

Son influence traverse les siècles et les courants : de l'école d'Akbar en Anatolie aux soufis indiens du Mogol, de Mevlânâ Rûmî à ʿAbd al-Qâdir al-Jazâʾirî qui demanda à reposer auprès de lui à Damas, sa pensée reste l'horizon métaphysique de toute la mystique islamique.`,
    works: [
      { title: "Al-Futûḥât al-Makkiyya", titleFr: "Les Illuminations de La Mecque" },
      { title: "Fuṣûṣ al-Ḥikam", titleFr: "Les Chatons des Sagesses" },
    ],
    bibliography: [
      {
        author: "Michel Chodkiewicz",
        title: "Le Sceau des saints. Prophétie et sainteté dans la doctrine d'Ibn ʿArabî",
        publisher: "Gallimard — Bibliothèque des Sciences Humaines",
        year: 1986,
        lang: "fr",
        note: "Étude centrale sur la doctrine de la walâya (sainteté) chez Ibn ʿArabî. Chodkiewicz est l'un des grands akbariens francophones du XXᵉ siècle.",
      },
      {
        author: "Charles-André Gilis (trad.)",
        title: "Le Livre des Chatons des Sagesses (Fuṣûṣ al-Ḥikam)",
        publisher: "Al-Bouraq",
        year: 1997,
        lang: "fr",
        note: "Traduction française complète des Fuṣûṣ, avec un long commentaire. Lecture exigeante mais incontournable.",
      },
      {
        author: "William C. Chittick",
        title: "The Sufi Path of Knowledge: Ibn al-ʿArabi's Metaphysics of Imagination",
        publisher: "SUNY Press",
        year: 1989,
        lang: "en",
        note: "Étude méthodique des Futûḥât al-Makkiyya, organisée par thèmes. La meilleure introduction académique en anglais à la métaphysique akbarienne.",
      },
      {
        author: "Henry Corbin",
        title: "L'Imagination créatrice dans le soufisme d'Ibn ʿArabî",
        publisher: "Flammarion — Champs",
        year: 1958,
        lang: "fr",
        note: "Lecture phénoménologique fondatrice, qui a fait connaître Ibn ʿArabî au monde francophone et inspiré toute une école.",
      },
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
    bioLong: `Né à Tûs, dans le Khorâsân, en 1058, Abû Ḥâmid Muḥammad al-Ghazâlî est, dès sa jeunesse, l'élève le plus brillant de son temps. À trente-trois ans, il enseigne la théologie à la Madrasa Niẓâmiyya de Bagdad, la plus prestigieuse de l'empire seljoukide. Il a la science, la gloire, l'oreille des princes.

Et il est en crise. Il découvre que tout son savoir, brillant, ne sauve pas son âme. Pris d'une angoisse mortelle, il abandonne sa chaire, sa famille, ses titres, et part — en pèlerinage, en retraite, en silence. Il errera onze années, soufi parmi les soufis, méditant à Damas, à Jérusalem, à La Mecque.

À son retour, il écrit l'Iḥyâʾ ʿulûm ad-dîn — la Revivification des sciences de la religion. Quarante livres en quatre tomes qui reprennent toute la vie musulmane et la nourrissent intérieurement : prier, jeûner, manger, se marier, gagner sa vie, mais aussi craindre Dieu, espérer, aimer, mourir. L'Iḥyâʾ devient le livre central de la spiritualité sunnite — au point qu'on dira : « Si tous les livres de l'Islam étaient perdus sauf l'Iḥyâʾ, on n'aurait perdu que peu de chose. »

Son génie aura été de réconcilier la science exotérique (ʿilm aẓ-ẓâhir) et la voie intérieure (ʿilm al-bâṭin), de montrer que la Loi est le portique du Chemin, et le Chemin la porte de la Vérité. Il meurt à Tûs en 1111, après avoir choisi une dernière fois la retraite et l'enseignement intime.`,
    works: [
      { title: "Iḥyâʾ ʿulûm ad-dîn", titleFr: "Revivification des sciences de la religion" },
      { title: "Mishkât al-Anwâr", titleFr: "Le Tabernacle des Lumières" },
      { title: "Al-Munqidh min aḍ-Ḍalâl", titleFr: "Erreur et délivrance" },
    ],
    bibliography: [
      {
        author: "Roger Deladrière (trad.)",
        title: "Le Tabernacle des Lumières (Mishkât al-Anwâr)",
        publisher: "Seuil — Sagesses",
        year: 1981,
        lang: "fr",
        note: "Traduction française de la grande méditation ghazâlienne sur le verset de la Lumière (Q. 24:35). Texte court mais central.",
      },
      {
        author: "Farid Jabre (trad.)",
        title: "Erreur et délivrance (al-Munqidh min aḍ-Ḍalâl)",
        publisher: "Commission libanaise / UNESCO, Beyrouth",
        year: 1959,
        lang: "fr",
        note: "L'autobiographie spirituelle de Ghazâlî — récit de sa crise et de son passage par le soufisme. La porte d'entrée naturelle dans son œuvre.",
      },
      {
        author: "Tabou Hachem (trad.) — collectif Ihya",
        title: "Revivification des sciences de la religion (Iḥyâʾ ʿulûm ad-dîn)",
        publisher: "Al-Bouraq / Maison d'Ennour (par livres séparés)",
        lang: "fr",
        note: "Traduction française progressive des 40 livres de l'Iḥyâʾ. Plusieurs volumes parus, à compléter par les éditions arabes (Dar al-Minhaj, Beyrouth) pour les livres non traduits.",
      },
      {
        author: "Eric Ormsby",
        title: "Ghazali: The Revival of Islam",
        publisher: "Oneworld — Makers of the Muslim World",
        year: 2007,
        lang: "en",
        note: "Biographie intellectuelle synthétique en anglais, idéale pour situer Ghazâlî dans son siècle et sa polémique avec les philosophes.",
      },
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
    bioLong: `Sahl ibn ʿAbd Allâh al-Tustarî, né en 818 à Tustar, dans l'actuelle province iranienne du Khûzestân, est l'une des grandes figures fondatrices du soufisme primitif. Il appartient à la génération qui, au IIIᵉ siècle de l'hégire, commence à formuler explicitement la voie spirituelle de l'Islam.

Son enseignement a marqué le maître syrien Junayd et, à travers lui, toute la tradition de Bagdad. On lui prête une jeunesse d'ascèse extrême — jeûnes prolongés, longues veilles, retraites au désert — et une science du Coran venue de la méditation plus que des livres : il aurait, dit-on, mémorisé le Texte et reçu, dans la pratique du dhikr et de la concentration intime, le sens caché de ses lettres.

Son ouvrage principal, le Tafsîr al-Tustarî, est le tout premier commentaire ésotérique systématique du Coran. Il y déploie l'idée qu'à chaque verset correspond une face extérieure (ẓâhir) et une face intérieure (bâṭin), et que la vie spirituelle consiste à passer de l'une à l'autre.

Mort en 896 à Bassora, où il s'était retiré, Tustarî reste pour la tradition la source de l'exégèse mystique. Son influence court à travers tout le soufisme oriental, jusqu'à Ibn ʿArabî qui le cite avec déférence et lui doit beaucoup de sa terminologie.`,
    works: [
      { title: "Tafsîr al-Tustarî", titleFr: "Commentaire ésotérique du Coran" },
    ],
    bibliography: [
      {
        author: "Sahl al-Tustarî",
        title: "Tafsîr al-Tustarî",
        publisher: "Dār al-Kutub al-ʿIlmiyya, Beyrouth (éd. Muḥammad Bāsil ʿUyūn al-Sūd)",
        year: 2002,
        lang: "ar",
        note: "Édition arabe de référence. Aussi disponible sur archive.org et shamela.ws.",
      },
      {
        author: "Annabel & Ali Keeler (trad.)",
        title: "Tafsīr al-Tustarī",
        publisher: "Fons Vitae / Royal Aal al-Bayt Institute — Great Commentaries on the Holy Qurʾan",
        year: 2011,
        lang: "en",
        note: "Traduction anglaise académique intégrale. Lisible en ligne sur altafsir.com.",
      },
      {
        author: "Paul Nwyia",
        title: "Exégèse coranique et langage mystique",
        publisher: "Dar el-Machreq, Beyrouth",
        year: 1970,
        lang: "fr",
        note: "Chapitres entiers sur Tustarî avec longs extraits traduits et commentés — la porte d'entrée en français.",
      },
      {
        author: "Gerhard Böwering",
        title: "The Mystical Vision of Existence in Classical Islam: The Quranic Hermeneutics of the Sūfī Sahl al-Tustarī",
        publisher: "de Gruyter",
        year: 1980,
        lang: "en",
        note: "La monographie de référence en anglais sur la pensée de Tustarî.",
      },
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
    bioLong: `Cette catégorie rassemble les voix de la grande tradition soufie — celles qui ne figurent pas sous le nom d'un seul des quatre maîtres principaux du corpus, mais qui forment, ensemble, la mémoire vivante de la Voie.

On y entend Râbiʿa al-ʿAdawiyya, la mystique de Bassora qui, au VIIIᵉ siècle, refusa de servir Dieu par crainte du feu ou désir du paradis, mais seulement par amour. Junayd al-Baghdâdî, le maître sobre, autour de qui s'est constituée la première école formalisée du soufisme. Bâyazîd al-Bistâmî, dont les extases ont laissé des paroles éblouissantes. Manṣûr al-Ḥallâj, qui paya de sa vie l'exclamation « Anâ al-Ḥaqq » — « Je suis la Vérité ». ʿAbd al-Qâdir al-Jîlânî, fondateur de la confrérie qâdiriyya, l'une des plus diffusées dans le monde musulman.

Ces voix, transmises par leurs disciples, recueillies dans les anthologies anciennes (Risâla d'al-Qushayrî, Lawâʾiḥ de Jâmî, Tabaqât d'al-Sulamî), continuent d'enseigner ce que le soufisme n'a cessé de répéter : que le chemin est intérieur, qu'il commence par la sincérité (ṣidq), et qu'au bout du dénuement attend la rencontre.`,
    works: [],
  },
];

export const MAITRE_BY_KEY = Object.fromEntries(
  MAITRES.map((m) => [m.key, m]),
) as Record<AuthorKey, Maitre>;
