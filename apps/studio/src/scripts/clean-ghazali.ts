/**
 * Reconstruction des chunks Al-Ghazali "Alchemy of Happiness" cassés.
 *
 * Le PDF source a été extrait avec un parser qui a perdu les espaces.
 * Et il a été ingéré 2 fois sous des noms différents
 * (alghazali_alchemy_of_happiness_en + _1873_en) avec ~10x duplication interne.
 *
 * Total : 2290 chunks → 229 contenus uniques.
 *
 * Ce script :
 *   1. Récupère les 229 contenus uniques
 *   2. Pour chacun : Claude reconstruit (sépare les mots collés)
 *      + traduit en français littéraire soufi
 *   3. Calcule un embedding OpenAI
 *   4. INSERT comme nouveau chunk avec metadata.work = "Kîmyâ-yi Saʿâdat..."
 *
 * Le DELETE des anciens chunks reste manuel (à lancer après vérification visuelle).
 *
 * Usage local (Windows) :
 *   pnpm --filter @soufi/studio clean:ghazali
 *
 * Usage VPS (depuis le container studio) :
 *   docker exec -it <container> pnpm exec tsx src/scripts/clean-ghazali.ts
 *
 * Coût estimé : ~1,5 € (Claude Sonnet + OpenAI embeddings)
 * Durée : ~5-10 min
 */

import { supabase } from "../lib/supabase.js";
import { anthropic, CLAUDE_MODEL } from "../lib/anthropic.js";
import { embed } from "../lib/openai.js";

const OLD_WORKS = [
  "alghazali_alchemy_of_happiness_en",
  "alghazali_alchemy_of_happiness_1873_en",
];

const NEW_WORK = "Kîmyâ-yi Saʿâdat (L'Alchimie du Bonheur)";

const SYSTEM_PROMPT = `Tu es un traducteur littéraire de prose mystique islamique, dans la lignée d'Eva de Vitray-Meyerovitch, Pierre Lory et Charles-André Gilis.

Tu reçois un extrait de l'œuvre "Alchemy of Happiness" (Kîmyâ-yi Saʿâdat) d'al-Ghazâlî en anglais, mais avec les mots collés ensemble sans espaces (problème d'extraction PDF). Le texte peut aussi contenir des numéros de page, des en-têtes de chapitre, ou du bruit OCR.

Ta tâche :
1. Reconstruis mentalement le texte anglais en séparant les mots
2. Identifie ce qui est du contenu réel d'al-Ghazâlî (ignore les en-têtes "Ghazzali's Alchemy of Happiness", numéros de page, marqueurs de structure)
3. Traduis ce contenu en français littéraire soufi

Critères de la traduction :
- Fidélité au sens, liberté pour le rythme et la musique
- Vocabulaire soufi français : cœur, Bien-Aimé, dévoilement, station (maqâm), état (ḥâl), science divine, présence, retour à Dieu
- Translittération sobre des termes arabes : ḥaqîqa, ṣabr, dhikr, tawḥîd, qalb, nafs
- Aucune glose, aucun commentaire, aucun crochet d'éditeur
- Pas d'introduction du type "Voici la traduction..."

Cas particuliers :
- Si le texte est trop court (< 20 mots utiles), trop bruité, ou réduit à un en-tête de chapitre/page sans contenu : retourne EXACTEMENT la chaîne "[ILLISIBLE]"
- Si tu ne reconnais pas le sens : "[ILLISIBLE]"

Rends UNIQUEMENT le texte français. Pas d'introduction, pas de note, juste la traduction (ou "[ILLISIBLE]").`;

interface OldChunk {
  id: number;
  content: string;
}

interface Stats {
  total: number;
  inserted: number;
  illisible: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

async function fetchUniqueChunks(): Promise<OldChunk[]> {
  const seen = new Set<string>();
  const unique: OldChunk[] = [];

  for (const work of OLD_WORKS) {
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("chunks")
        .select("id, content")
        .eq("metadata->>work", work)
        .order("id", { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) throw new Error(`Supabase fetch error: ${error.message}`);
      if (!data || data.length === 0) break;

      for (const row of data) {
        const content = (row.content as string).trim();
        if (content.length < 20) continue;
        if (!seen.has(content)) {
          seen.add(content);
          unique.push({ id: row.id as number, content });
        }
      }

      if (data.length < batchSize) break;
      offset += batchSize;
    }
  }

  return unique;
}

interface ReconstructResult {
  text: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

async function reconstructAndTranslate(text: string): Promise<ReconstructResult> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: text.slice(0, 4000) },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text.trim() : null;
  const text_out = raw === "[ILLISIBLE]" || raw === null || raw.length < 10 ? null : raw;

  return {
    text: text_out,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  };
}

async function processChunk(
  old: OldChunk,
  stats: Stats,
): Promise<"inserted" | "illisible" | "failed"> {
  try {
    const result = await reconstructAndTranslate(old.content);
    stats.inputTokens += result.inputTokens;
    stats.outputTokens += result.outputTokens;
    stats.cacheReadTokens += result.cacheReadTokens;

    if (!result.text) {
      return "illisible";
    }

    const embedding = await embed(result.text);

    const { error } = await supabase.from("chunks").insert({
      content: result.text,
      embedding,
      metadata: {
        author: "Al-Ghazali",
        work: NEW_WORK,
        work_fr: "L'Alchimie du Bonheur",
        language: "fr",
        tradition: "soufisme",
        translated_from_en: true,
        original_legacy_id: old.id,
        source_text: "Iḥyâʾ ʿulûm ad-dîn (résumé persan)",
        citation_allowed: true,
      },
    });

    if (error) {
      console.error(`\n  ❌ insert ${old.id}: ${error.message}`);
      return "failed";
    }
    return "inserted";
  } catch (e) {
    console.error(`\n  ❌ chunk ${old.id} crash: ${String(e).slice(0, 200)}`);
    return "failed";
  }
}

async function checkExisting(): Promise<number> {
  const { count, error } = await supabase
    .from("chunks")
    .select("*", { count: "exact", head: true })
    .eq("metadata->>work", NEW_WORK);
  if (error) throw new Error(`Check existing failed: ${error.message}`);
  return count ?? 0;
}

function estimateCost(stats: Stats): string {
  // Claude Sonnet 4.6 pricing (approx) :
  //   $3 / M input tokens
  //   $0.30 / M cache read
  //   $15 / M output tokens
  //   $0.10 / M embeddings (text-embedding-3-small)
  const claudeInputCost = (stats.inputTokens - stats.cacheReadTokens) * 3 / 1_000_000;
  const claudeCacheCost = stats.cacheReadTokens * 0.3 / 1_000_000;
  const claudeOutputCost = stats.outputTokens * 15 / 1_000_000;
  const total = claudeInputCost + claudeCacheCost + claudeOutputCost;
  return `~${(total * 0.92).toFixed(3)} € (Claude seul, embeddings négligeables)`;
}

async function main(): Promise<void> {
  console.log("\n🕌 Reconstruction Al-Ghazali — anglais cassé → français littéraire");
  console.log("─────────────────────────────────────────────────────────────");

  const existing = await checkExisting();
  if (existing > 0) {
    console.log(`\n⚠️  ${existing} chunks "${NEW_WORK}" existent déjà.`);
    console.log("Pour refaire from scratch, supprime-les d'abord :");
    console.log(`  DELETE FROM chunks WHERE metadata->>'work' = '${NEW_WORK}';\n`);
    process.exit(0);
  }

  console.log("\n🔍 Récupération des chunks uniques...");
  const chunks = await fetchUniqueChunks();
  console.log(`→ ${chunks.length} chunks uniques à traiter\n`);

  if (chunks.length === 0) {
    console.log("Rien à faire — aucun chunk Ghazali EN trouvé.");
    return;
  }

  const stats: Stats = {
    total: chunks.length,
    inserted: 0,
    illisible: 0,
    failed: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
  };

  const started = Date.now();

  for (let i = 0; i < chunks.length; i++) {
    const result = await processChunk(chunks[i]!, stats);
    if (result === "inserted") stats.inserted += 1;
    else if (result === "illisible") stats.illisible += 1;
    else stats.failed += 1;

    const pct = Math.round((100 * (i + 1)) / chunks.length);
    const elapsed = Math.round((Date.now() - started) / 1000);
    process.stdout.write(
      `\rProgression : ${i + 1}/${chunks.length} (${pct}%) — ` +
        `${stats.inserted} ✅  ${stats.illisible} 🪨  ${stats.failed} ❌  — ${elapsed}s`,
    );
  }

  const totalSec = Math.round((Date.now() - started) / 1000);
  console.log("\n\n─────────────────────────────────────────────────────────────");
  console.log(`✅ Terminé en ${totalSec}s`);
  console.log(`   Insérés en français : ${stats.inserted}`);
  console.log(`   Marqués [ILLISIBLE] : ${stats.illisible}  (chunks trop bruités, on n'insère pas)`);
  console.log(`   Échecs              : ${stats.failed}`);
  console.log(`   Tokens Claude in    : ${stats.inputTokens.toLocaleString("fr-FR")} (dont ${stats.cacheReadTokens.toLocaleString("fr-FR")} cached)`);
  console.log(`   Tokens Claude out   : ${stats.outputTokens.toLocaleString("fr-FR")}`);
  console.log(`   Coût estimé         : ${estimateCost(stats)}`);

  console.log("\n📋 Étapes suivantes :");
  console.log("   1. Vérifier visuellement quelques chunks dans Supabase :");
  console.log(`      SELECT content FROM chunks WHERE metadata->>'work' = '${NEW_WORK}' LIMIT 5;`);
  console.log("\n   2. Si OK, supprimer les vieux chunks anglais cassés :");
  console.log(`      DELETE FROM chunks`);
  console.log(`      WHERE metadata->>'work' IN (`);
  console.log(`        'alghazali_alchemy_of_happiness_en',`);
  console.log(`        'alghazali_alchemy_of_happiness_1873_en'`);
  console.log(`      );`);
  console.log("\n   3. Vérifier le compte final par auteur :");
  console.log("      SELECT metadata->>'author', COUNT(*) FROM chunks GROUP BY 1 ORDER BY 2 DESC;\n");
}

main().catch((err) => {
  console.error("\n❌ Script crashed:", err);
  process.exit(1);
});
