/**
 * Script de migration du corpus chunks d'un projet Supabase à un autre.
 *
 * Usage :
 *   1. Crée un fichier .env.migrate à la racine du monorepo avec :
 *        OLD_SUPABASE_URL=https://eeqwxxstrmnqurmtbhfj.supabase.co
 *        OLD_SUPABASE_SERVICE_KEY=eyJ...
 *        NEW_SUPABASE_URL=https://icjvjabyhhugkxauytxh.supabase.co
 *        NEW_SUPABASE_SERVICE_KEY=eyJ...
 *   2. Lance : pnpm --filter @soufi/studio migrate:corpus
 *
 * Le script :
 *   - vérifie que la table 'chunks' existe sur le nouveau projet
 *   - lit l'ancien projet par batches de 100 lignes
 *   - écrit dans le nouveau projet en préservant content, embedding, metadata, created_at
 *   - affiche la progression et reprend où il s'était arrêté en cas de coupure
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const env = z
  .object({
    OLD_SUPABASE_URL: z.string().url(),
    OLD_SUPABASE_SERVICE_KEY: z.string().min(20),
    NEW_SUPABASE_URL: z.string().url(),
    NEW_SUPABASE_SERVICE_KEY: z.string().min(20),
    BATCH_SIZE: z.coerce.number().default(100),
    DRY_RUN: z
      .string()
      .optional()
      .transform((v) => v === "true" || v === "1"),
  })
  .parse(process.env);

const oldDb = createClient(env.OLD_SUPABASE_URL, env.OLD_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const newDb = createClient(env.NEW_SUPABASE_URL, env.NEW_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

interface ChunkRow {
  id: number;
  content: string;
  embedding: number[] | string;
  metadata: Record<string, unknown>;
  created_at: string;
}

async function getCount(db: SupabaseClient, label: string): Promise<number> {
  const { count, error } = await db
    .from("chunks")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`[${label}] count error: ${error.message}`);
  return count ?? 0;
}

async function ensureNewTable(): Promise<void> {
  const { error } = await newDb.from("chunks").select("id").limit(1);
  if (error) {
    console.error("\n❌ La table 'chunks' n'existe pas sur le nouveau projet.\n");
    console.error("Avant de lancer la migration, exécute supabase/setup.sql dans :");
    console.error(`   ${env.NEW_SUPABASE_URL.replace(".supabase.co", "")}/project/sql/new\n`);
    process.exit(1);
  }
}

function parseEmbedding(raw: number[] | string): number[] {
  if (Array.isArray(raw)) return raw;
  // pgvector renvoie parfois "[0.123,0.456,...]" en string
  if (typeof raw === "string") {
    const cleaned = raw.replace(/^\[/, "").replace(/\]$/, "");
    return cleaned.split(",").map((s) => Number(s.trim()));
  }
  throw new Error("Embedding format inattendu");
}

async function migrate(): Promise<void> {
  console.log("\n🕌 Migration du corpus Soufi Studio");
  console.log("─────────────────────────────────────────");
  console.log(`Source : ${env.OLD_SUPABASE_URL}`);
  console.log(`Cible  : ${env.NEW_SUPABASE_URL}`);
  console.log(`Batch  : ${env.BATCH_SIZE} lignes`);
  if (env.DRY_RUN) console.log("Mode   : DRY RUN (aucune écriture)");
  console.log("─────────────────────────────────────────\n");

  await ensureNewTable();

  const [oldCount, newCount] = await Promise.all([
    getCount(oldDb, "old"),
    getCount(newDb, "new"),
  ]);

  console.log(`Ancien projet : ${oldCount.toLocaleString("fr-FR")} chunks`);
  console.log(`Nouveau projet : ${newCount.toLocaleString("fr-FR")} chunks déjà présents`);

  if (newCount >= oldCount) {
    console.log("\n✅ Le nouveau projet contient déjà tout (ou plus). Rien à faire.\n");
    return;
  }

  // Reprise : on saute les N premières lignes déjà migrées
  let offset = newCount;
  let migrated = 0;
  let failed = 0;
  const started = Date.now();

  while (offset < oldCount) {
    const { data, error } = await oldDb
      .from("chunks")
      .select("id, content, embedding, metadata, created_at")
      .order("id", { ascending: true })
      .range(offset, offset + env.BATCH_SIZE - 1);

    if (error) {
      console.error(`\n❌ Erreur lecture offset=${offset}:`, error.message);
      break;
    }

    if (!data || data.length === 0) {
      console.log("\nFin du corpus source atteinte.");
      break;
    }

    const rows = (data as ChunkRow[]).map((r) => ({
      content: r.content,
      embedding: parseEmbedding(r.embedding),
      metadata: r.metadata,
      created_at: r.created_at,
    }));

    if (env.DRY_RUN) {
      migrated += rows.length;
    } else {
      const { error: insertErr } = await newDb.from("chunks").insert(rows);

      if (insertErr) {
        console.error(`⚠️  Batch offset=${offset} erreur : ${insertErr.message} — retry...`);
        await new Promise((r) => setTimeout(r, 2000));
        const { error: retryErr } = await newDb.from("chunks").insert(rows);
        if (retryErr) {
          console.error(`❌ Batch offset=${offset} échec après retry. On saute.`);
          failed += rows.length;
        } else {
          migrated += rows.length;
        }
      } else {
        migrated += rows.length;
      }
    }

    offset += data.length;
    const pct = Math.round((100 * offset) / oldCount);
    const elapsed = Math.round((Date.now() - started) / 1000);
    process.stdout.write(
      `\rProgression : ${offset.toLocaleString("fr-FR")}/${oldCount.toLocaleString("fr-FR")} ` +
        `(${pct}%) — ${migrated} migrés, ${failed} échecs — ${elapsed}s`,
    );
  }

  console.log("\n\n─────────────────────────────────────────");
  console.log(`✅ Migration terminée`);
  console.log(`   Migrés : ${migrated.toLocaleString("fr-FR")}`);
  console.log(`   Échecs : ${failed.toLocaleString("fr-FR")}`);
  console.log(`   Durée  : ${Math.round((Date.now() - started) / 1000)}s`);

  // Vérification finale
  const finalCount = await getCount(newDb, "new");
  console.log(
    `\nVérification : nouveau projet contient ${finalCount.toLocaleString("fr-FR")} chunks ` +
      `(attendu : ${oldCount.toLocaleString("fr-FR")})`,
  );
  if (finalCount === oldCount) {
    console.log("✅ Compte exact — migration validée.\n");
  } else {
    console.log(`⚠️  Écart de ${oldCount - finalCount} lignes — relance le script.\n`);
  }
}

migrate().catch((err) => {
  console.error("\n❌ Migration interrompue :", err);
  process.exit(1);
});
