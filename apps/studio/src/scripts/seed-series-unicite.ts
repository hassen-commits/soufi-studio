/**
 * Seed série "L'Unicité chez les grands maîtres" — 4 épisodes planifiés.
 *
 * Usage : tsx src/scripts/seed-series-unicite.ts
 *
 * Idempotent : skip si le slug existe déjà.
 * Crée chaque épisode en statut 'planned' → l'humain les lance ensuite
 * via le bouton "Produire" du dashboard admin.
 */
import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

interface EpisodeSeed {
  slug: string;
  title: string;
  themeFr: string;
  author: string;
  description: string;
}

const SERIES: EpisodeSeed[] = [
  {
    slug: "ibn-arabi-wahdat-al-wujud",
    title: "L'Unicité de l'Être — Waḥdat al-Wujûd",
    themeFr: "Tawḥîd · Ibn ʿArabî",
    author: "ibn_arabi",
    description:
      "Le Cheikh al-Akbar pose que l'Être est Un, et que toute la création n'est que les Faces de cet Être qui se déploient. Méditation sur la doctrine centrale de waḥdat al-wujûd, à travers les Chatons des Sagesses (Fuṣûṣ al-Ḥikam) et les Illuminations de La Mecque.",
  },
  {
    slug: "ghazali-tawhid-depouillement",
    title: "Le Tawḥîd comme dépouillement",
    themeFr: "Tawḥîd · Al-Ghazâlî",
    author: "ghazali",
    description:
      "Pour Ghazâlî, l'unicité n'est pas une thèse à affirmer, c'est un état où le serviteur disparaît pour ne laisser que l'Un. À partir du livre 35 de l'Iḥyâ' 'Ulûm al-Dîn (Kitâb al-Tawḥîd wa al-Tawakkul).",
  },
  {
    slug: "tustari-shahada-interieure",
    title: "La Shahada intérieure — l'Unicité chez Tustarî",
    themeFr: "Tawḥîd · Al-Tustarî",
    author: "tustari",
    description:
      "L'un des plus anciens commentaires ésotériques du Coran. Sahl al-Tustarî lit le « Lâ ilâha illâ Allâh » non comme une formule à réciter, mais comme une réalité à dévoiler dans le cœur.",
  },
  {
    slug: "rumi-amour-vers-l-un",
    title: "L'amour comme voie vers l'Un",
    themeFr: "Tawḥîd · Rûmî",
    author: "rumi",
    description:
      "Pour Rûmî, l'Unicité n'est pas un concept à saisir mais un retour à effectuer — par l'amour (ʿishq), qui dissout toute séparation. Capsule sur les passages du Mathnawî et du Dîwân de Shams qui chantent ce retour à l'Origine.",
  },
];

async function main() {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  for (const ep of SERIES) {
    const { data: existing } = await sb
      .from("episodes")
      .select("id, slug, status")
      .eq("slug", ep.slug)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  ${ep.slug} : déjà présent (status=${existing.status})`);
      continue;
    }

    const { data, error } = await sb
      .from("episodes")
      .insert({
        slug: ep.slug,
        title: ep.title,
        description: ep.description,
        mode: "podcast",
        status: "planned",
        authors: [ep.author],
        themes: ["tawhid", ep.themeFr],
        citation_ids: [],
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ ${ep.slug} : ${error.message}`);
      continue;
    }

    console.log(`✅ ${ep.slug} créé (id=${data.id})`);
  }

  console.log("\n--- État de la série ---");
  const { data: list } = await sb
    .from("episodes")
    .select("slug, title, status, authors")
    .in("slug", SERIES.map((e) => e.slug));
  for (const ep of list ?? []) {
    console.log(`  [${ep.status}] ${ep.title} (${(ep.authors ?? []).join(",")})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
