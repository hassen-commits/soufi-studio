/**
 * Traduit en français propre les chunks Tustarî qui sont en anglais
 * (source : PDF Keeler / Fons Vitae), pour avoir une page maître
 * cohérente avec le reste du site francophone.
 *
 * Usage :
 *   apps/studio/node_modules/.bin/dotenv -e ../../.env -- \
 *     apps/studio/node_modules/.bin/tsx \
 *       apps/studio/src/scripts/translate-tustari-chunks.ts [--limit 80] [--dry]
 *
 * Pré-requis : exécuter d'abord supabase/add-content-fr.sql dans Supabase.
 *
 * Idempotent : skip les chunks qui ont déjà content_fr renseigné.
 * Ne touche pas la colonne `content` ni l'embedding (la recherche RAG
 * reste basée sur le texte original).
 */
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";

const TUSTARI_AUTHOR = "Sahl al-Tustari";

interface Row {
  id: number;
  content: string;
  content_fr: string | null;
}

// Même heuristique que apps/web : on évite de payer des appels API pour des
// fragments bibliographiques / footnotes / pages d'index qui ne seront
// jamais affichés de toute façon.
function looksLikeNoise(text: string): boolean {
  const t = text.trim();
  if (/^\d{1,3}\s+[A-Z]/.test(t)) return true;
  if (/\bMSS?\b|\bf\.\s+\d|\bed\.\s|\bff\.\s+\d/.test(t)) return true;
  if (/[A-Z]\d{2,4}[a-z]?\b/.test(t)) return true;
  if (/,\s+(?:[ivxlcd]+|\d+)(?:\s*,\s*(?:[ivxlcd]+|\d+))+/i.test(t)) return true;
  if (/\b(Fons Vitae|de Gruyter|Brill|Royal Aal|Institute for Islamic)\b/.test(t)) return true;
  const bracketCount = (t.match(/\[[a-z]+\]/g) ?? []).length;
  if (bracketCount >= 2) return true;
  // Fragments mid-phrase (commence en minuscule) — fréquents dans Tustarî
  if (/^[a-z]/.test(t)) return true;
  // Mentions techniques de versions / pages dans le texte
  if (/\bvol\.\s+\d|\bp\.\s+\d/.test(t)) return true;
  // Longueur trop courte = pas exploitable
  if (t.length < 60) return true;
  return false;
}

const TRANSLATION_SYSTEM = `Tu es un traducteur spécialisé dans les textes mystiques islamiques. Tu reçois un passage en anglais issu du commentaire ésotérique du Coran (Tafsîr) de Sahl al-Tustarî, dans la traduction académique de Keeler.

Règles de traduction :
1. Traduis en français soigné et littéraire, dans le registre de la spiritualité classique.
2. Conserve les termes techniques arabes translittérés (taqwâ, bâṭin, ẓâhir, tafsîr, dhikr, fanâʾ, tawakkul, ṣabr, etc.) — ne les francise pas. Préserve les diacritiques.
3. Si le texte contient un crochet éditorial [comme ceci], intègre le mot dans la traduction sans le crochet.
4. Conserve les références coraniques sous la forme (Q. 2:3) si présentes.
5. Ne rajoute AUCUN commentaire, note ou introduction. Réponds UNIQUEMENT avec la traduction française, rien d'autre.
6. Si le passage est manifestement un fragment de table des matières, bibliographie, ou note de bas de page (pas du contenu spirituel), réponds exactement : SKIP`;

interface Args {
  limit: number;
  dry: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit = 80;
  let dry = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = Number(args[i + 1]);
      i++;
    } else if (args[i] === "--dry") {
      dry = true;
    }
  }
  return { limit, dry };
}

async function translateOne(
  client: Anthropic,
  text: string,
): Promise<string | null> {
  const completion = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 1500,
    system: TRANSLATION_SYSTEM,
    messages: [{ role: "user", content: text }],
  });
  const answer = completion.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (answer === "SKIP" || answer.length === 0) return null;
  return answer;
}

async function main() {
  const { limit, dry } = parseArgs();

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  console.log(`Fetching Tustarî chunks (limit=${limit}, dry=${dry})…`);
  const { data, error } = await sb
    .from("chunks")
    .select("id, content, content_fr")
    .eq("metadata->>author", TUSTARI_AUTHOR)
    .is("content_fr", null)
    .order("id", { ascending: true })
    .limit(limit * 3); // marge car on va en filtrer beaucoup

  if (error) {
    console.error("Supabase error:", error);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  console.log(`Total chunks fetched (non-translated) : ${rows.length}`);

  const toTranslate = rows
    .filter((r) => !looksLikeNoise(String(r.content ?? "")))
    .slice(0, limit);
  console.log(`After noise filter, will translate : ${toTranslate.length}`);

  if (dry) {
    console.log("\n--- DRY RUN — would translate ---");
    for (const r of toTranslate.slice(0, 3)) {
      console.log(`\n[id=${r.id}] ${r.content.slice(0, 200)}…`);
    }
    return;
  }

  let ok = 0;
  let skipped = 0;
  let errors = 0;
  for (const [i, row] of toTranslate.entries()) {
    process.stdout.write(`[${i + 1}/${toTranslate.length}] id=${row.id} … `);
    try {
      const fr = await translateOne(anthropic, row.content);
      if (!fr) {
        process.stdout.write("SKIP (modèle a refusé)\n");
        skipped++;
        continue;
      }
      const { error: upErr } = await sb
        .from("chunks")
        .update({ content_fr: fr })
        .eq("id", row.id);
      if (upErr) throw upErr;
      process.stdout.write(`OK (${fr.length} car.)\n`);
      ok++;
    } catch (e) {
      process.stdout.write(`ERROR ${String(e)}\n`);
      errors++;
    }
  }

  console.log(`\nDone — ok=${ok} skipped=${skipped} errors=${errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
