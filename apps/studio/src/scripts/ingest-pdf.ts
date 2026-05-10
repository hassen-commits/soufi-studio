/**
 * Ingestion d'un PDF dans le corpus Supabase.
 *
 * Lit un PDF, en extrait le texte (en préservant les espaces — leçon
 * apprise des Ghazali EN cassés), le découpe en chunks de ~500 chars
 * par paragraphes, génère les embeddings et insère dans Supabase.
 *
 * Usage :
 *   pnpm --filter @soufi/studio ingest:pdf -- \
 *     --pdf "C:/Users/Sirine/Downloads/ghazali_mishkat.pdf" \
 *     --author "Al-Ghazali" \
 *     --work "Mishkât al-Anwâr (Le Tabernacle des Lumières)" \
 *     --work-fr "Le Tabernacle des Lumières" \
 *     --language fr \
 *     --chunk-size 600
 *
 * Tu peux aussi passer --start-page et --end-page pour ignorer
 * la couverture, la table des matières et la bibliographie.
 *
 * Coût : ~0,01 € pour 100 chunks (embeddings only, pas de Claude).
 * Vitesse : ~5 chunks/seconde.
 */

import { readFile, stat } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import pdf from "pdf-parse";
import { supabase } from "../lib/supabase.js";
import { embed } from "../lib/openai.js";

const argsSchema = z.object({
  pdf: z.string(),
  author: z.string(),
  work: z.string(),
  "work-fr": z.string().optional(),
  language: z.enum(["fr", "en", "ar"]).default("fr"),
  tradition: z.string().default("soufisme"),
  "chunk-size": z.coerce.number().min(200).max(2000).default(600),
  "chunk-overlap": z.coerce.number().min(0).max(500).default(80),
  "start-page": z.coerce.number().optional(),
  "end-page": z.coerce.number().optional(),
  "dry-run": z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

type Args = z.infer<typeof argsSchema>;

function parseCliArgs(): Args {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      pdf: { type: "string" },
      author: { type: "string" },
      work: { type: "string" },
      "work-fr": { type: "string" },
      language: { type: "string", default: "fr" },
      tradition: { type: "string", default: "soufisme" },
      "chunk-size": { type: "string", default: "600" },
      "chunk-overlap": { type: "string", default: "80" },
      "start-page": { type: "string" },
      "end-page": { type: "string" },
      "dry-run": { type: "string" },
    },
    strict: false,
  });

  const parsed = argsSchema.safeParse(values);
  if (!parsed.success) {
    console.error("\n❌ Arguments invalides :\n");
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    console.error("\nUsage minimal :");
    console.error('  pnpm ingest:pdf -- --pdf "chemin.pdf" --author "Al-Ghazali" --work "Mishkât al-Anwâr"');
    process.exit(1);
  }
  return parsed.data;
}

interface PdfPageData {
  pageContent?: string;
  text?: string;
}

async function extractText(args: Args): Promise<string> {
  const buf = await readFile(args.pdf);

  // pdf-parse permet une option pagerender custom pour filtrer par page
  const wantStart = args["start-page"] ?? 1;
  const wantEnd = args["end-page"] ?? Number.MAX_SAFE_INTEGER;
  const pages: string[] = [];
  let pageNum = 0;

  const data = await pdf(buf, {
    pagerender: (pageData: PdfPageData) => {
      pageNum += 1;
      if (pageNum < wantStart || pageNum > wantEnd) return Promise.resolve("");
      // pdf-parse passe l'objet pageData de pdfjs ; appelle la méthode standard
      // pour extraire le texte avec espaces préservés
      const renderOptions = { normalizeWhitespace: true, disableCombineTextItems: false };
      // @ts-expect-error - pdf-parse n'expose pas le type complet de pageData
      return pageData.getTextContent(renderOptions).then((tc: { items: { str: string }[] }) => {
        const text = tc.items.map((it) => it.str).join(" ");
        pages.push(text);
        return text;
      });
    },
  });

  // Si pagerender n'a rien produit, fallback sur data.text
  if (pages.length === 0) return data.text;
  return pages.join("\n\n");
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/-\n([a-zà-ÿ])/gi, "$1") // recolle les mots coupés en fin de ligne
    .trim();
}

function chunkText(text: string, size: number, overlap: number): string[] {
  // Split par paragraphes (double newline)
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length >= 30);

  const chunks: string[] = [];
  let buffer = "";

  for (const p of paragraphs) {
    const candidate = buffer ? buffer + "\n\n" + p : p;

    if (candidate.length <= size) {
      buffer = candidate;
      continue;
    }

    // Buffer plein : on flush
    if (buffer) chunks.push(buffer);

    // Si paragraphe seul est trop grand, on le coupe en morceaux
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size - overlap) {
        chunks.push(p.slice(i, i + size).trim());
      }
      buffer = "";
    } else {
      buffer = p;
    }
  }
  if (buffer) chunks.push(buffer);

  return chunks.filter((c) => c.length >= 50);
}

async function main(): Promise<void> {
  const args = parseCliArgs();
  const pdfPath = resolve(args.pdf);

  console.log("\n📖 Ingestion PDF — Soufi Studio");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Fichier  : ${pdfPath}`);
  console.log(`Auteur   : ${args.author}`);
  console.log(`Œuvre    : ${args.work}`);
  console.log(`Langue   : ${args.language}`);
  console.log(`Chunks   : ~${args["chunk-size"]} chars (overlap ${args["chunk-overlap"]})`);
  if (args["start-page"] || args["end-page"]) {
    console.log(`Pages    : ${args["start-page"] ?? 1} → ${args["end-page"] ?? "fin"}`);
  }
  if (args["dry-run"]) console.log("Mode     : DRY RUN (pas d'insertion)");
  console.log("─────────────────────────────────────────────────────────────\n");

  // Vérifier le fichier
  try {
    const s = await stat(pdfPath);
    if (s.size === 0) throw new Error("PDF vide");
    if (s.size > 50 * 1024 * 1024) {
      console.warn(`⚠️  PDF volumineux (${Math.round(s.size / 1024 / 1024)} MB) — ça peut être long.\n`);
    }
  } catch (e) {
    console.error(`❌ Fichier introuvable ou invalide : ${pdfPath}`);
    console.error(`   ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }

  console.log("🔍 Extraction texte...");
  const rawText = await extractText(args);
  console.log(`   ${rawText.length.toLocaleString("fr-FR")} caractères bruts`);

  const cleaned = cleanText(rawText);
  console.log(`   ${cleaned.length.toLocaleString("fr-FR")} caractères après nettoyage`);

  const chunks = chunkText(cleaned, args["chunk-size"], args["chunk-overlap"]);
  console.log(`   ${chunks.length} chunks générés (taille moyenne ${Math.round(cleaned.length / chunks.length)} chars)\n`);

  if (chunks.length === 0) {
    console.error("❌ Aucun chunk généré. Vérifie le PDF.");
    process.exit(1);
  }

  // Aperçu des 3 premiers chunks
  console.log("📜 Aperçu des 3 premiers chunks :\n");
  for (let i = 0; i < Math.min(3, chunks.length); i++) {
    const c = chunks[i]!;
    console.log(`   [${i + 1}] ${c.slice(0, 140).replace(/\n/g, " ")}${c.length > 140 ? "…" : ""}`);
    console.log("");
  }

  if (args["dry-run"]) {
    console.log("✅ DRY RUN terminé. Relance sans --dry-run pour insérer.\n");
    return;
  }

  // Insertion
  let success = 0;
  let failed = 0;
  const started = Date.now();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    try {
      const embedding = await embed(chunk);
      const { error } = await supabase.from("chunks").insert({
        content: chunk,
        embedding,
        metadata: {
          author: args.author,
          work: args.work,
          work_fr: args["work-fr"] ?? args.work,
          language: args.language,
          tradition: args.tradition,
          source_file: basename(pdfPath),
          chunk_index: i + 1,
          chunk_total: chunks.length,
          extraction_method: "pdf_text",
          ingested_at: new Date().toISOString(),
          citation_allowed: true,
        },
      });
      if (error) {
        failed += 1;
        console.error(`\n  ❌ chunk ${i + 1}: ${error.message}`);
      } else {
        success += 1;
      }
    } catch (e) {
      failed += 1;
      console.error(`\n  ❌ chunk ${i + 1}: ${String(e).slice(0, 200)}`);
    }

    const pct = Math.round((100 * (i + 1)) / chunks.length);
    const elapsed = Math.round((Date.now() - started) / 1000);
    process.stdout.write(
      `\rIngestion : ${i + 1}/${chunks.length} (${pct}%) — ${success} OK, ${failed} ❌ — ${elapsed}s`,
    );
  }

  const totalSec = Math.round((Date.now() - started) / 1000);
  console.log("\n\n─────────────────────────────────────────────────────────────");
  console.log(`✅ Terminé en ${totalSec}s`);
  console.log(`   Insérés : ${success}/${chunks.length}`);
  console.log(`   Échecs  : ${failed}`);
  console.log(`\n📋 Vérification dans Supabase :`);
  console.log(`   SELECT COUNT(*) FROM chunks WHERE metadata->>'work' = '${args.work.replace(/'/g, "''")}';\n`);
}

main().catch((err) => {
  console.error("\n❌ Script crashed:", err);
  process.exit(1);
});
