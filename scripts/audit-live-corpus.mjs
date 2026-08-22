import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

let envText;
try {
  envText = await readFile(".env", "utf8");
} catch {
  try {
    envText = await readFile("../.env", "utf8");
  } catch {
    envText = await readFile("../.env.txt", "utf8");
  }
}
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
    }),
);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error("Impossible de trouver la configuration publique Supabase dans les bundles du site.");
}

const rows = [];
const pageSize = 1000;
for (let offset = 0; ; offset += pageSize) {
  const endpoint = new URL("/rest/v1/chunks", supabaseUrl);
  endpoint.searchParams.set("select", "id,content,content_fr,metadata");
  endpoint.searchParams.set("order", "id.asc");
  const response = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Range: `${offset}-${offset + pageSize - 1}`,
      Prefer: "count=exact",
    },
  });
  if (!response.ok) throw new Error(`Lecture Supabase impossible (${response.status}).`);
  const batch = await response.json();
  rows.push(...batch);
  if (batch.length < pageSize) break;
}

const normalize = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const group = (items, keyFn) => {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item) || "Non renseigné";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, rate: Number((count / items.length).toFixed(4)) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const fingerprints = new Map();
for (const row of rows) {
  const hash = createHash("sha256").update(normalize(row.content_fr || row.content)).digest("hex");
  const matches = fingerprints.get(hash) ?? [];
  matches.push(row);
  fingerprints.set(hash, matches);
}
const duplicateGroups = [...fingerprints.values()].filter((matches) => matches.length > 1);
const duplicateRows = duplicateGroups.reduce((sum, matches) => sum + matches.length - 1, 0);
const nonFrench = rows.filter((row) => (row.metadata?.language ?? "fr") !== "fr");
const translatedNonFrench = nonFrench.filter((row) => normalize(row.content_fr).length > 0);
const missingWork = rows.filter((row) => !normalize(row.metadata?.work_fr || row.metadata?.work)).length;
const missingSourceFile = rows.filter((row) => !normalize(row.metadata?.source_file)).length;

const workLabel = (row) => row.metadata?.work_fr || row.metadata?.work || "Non renseigné";
const sourceLabel = (row) => row.metadata?.source_file || "Non renseigné";
const duplicatePairCounts = new Map();
const duplicateExtrasByWork = new Map();
let crossWorkDuplicateGroups = 0;

for (const matches of duplicateGroups) {
  const works = [...new Set(matches.map(workLabel))].sort();
  if (works.length > 1) crossWorkDuplicateGroups += 1;
  for (let i = 0; i < works.length; i += 1) {
    for (let j = i + 1; j < works.length; j += 1) {
      const pair = `${works[i]} ↔ ${works[j]}`;
      duplicatePairCounts.set(pair, (duplicatePairCounts.get(pair) ?? 0) + 1);
    }
  }
  const ranked = [...matches].sort((a, b) => {
    const score = (row) =>
      Number(Boolean(row.metadata?.source_file)) +
      Number(Boolean(row.metadata?.work_fr || row.metadata?.work)) +
      Number(Boolean(row.content_fr)) +
      Number((row.metadata?.language ?? "fr") === "fr");
    return score(b) - score(a) || String(a.id).localeCompare(String(b.id));
  });
  for (const duplicate of ranked.slice(1)) {
    const work = workLabel(duplicate);
    duplicateExtrasByWork.set(work, (duplicateExtrasByWork.get(work) ?? 0) + 1);
  }
}

const sortedMap = (map, labelKey) =>
  [...map.entries()]
    .map(([label, count]) => ({ [labelKey]: label, count }))
    .sort((a, b) => b.count - a.count || String(a[labelKey]).localeCompare(String(b[labelKey])));

const audit = {
  generatedAt: new Date().toISOString(),
  dataset: "Production Supabase public.chunks",
  grain: "Un passage extrait (chunk) par ligne",
  totals: {
    rows: rows.length,
    distinctText: fingerprints.size,
    duplicateGroups: duplicateGroups.length,
    duplicateRows,
    duplicateRate: Number((duplicateRows / rows.length).toFixed(4)),
    missingWork,
    missingWorkRate: Number((missingWork / rows.length).toFixed(4)),
    missingSourceFile,
    missingSourceFileRate: Number((missingSourceFile / rows.length).toFixed(4)),
    nonFrenchRows: nonFrench.length,
    translatedNonFrenchRows: translatedNonFrench.length,
    untranslatedNonFrenchRows: nonFrench.length - translatedNonFrench.length,
  },
  byAuthor: group(rows, (row) => row.metadata?.author),
  byLanguage: group(rows, (row) => row.metadata?.language ?? "fr"),
  byWork: group(rows, (row) => row.metadata?.work_fr || row.metadata?.work),
  bySourceFile: group(rows, (row) => row.metadata?.source_file),
  duplicates: {
    sameWorkGroups: duplicateGroups.length - crossWorkDuplicateGroups,
    crossWorkGroups: crossWorkDuplicateGroups,
    topWorkPairs: sortedMap(duplicatePairCounts, "pair").slice(0, 20),
    removableRowsByWork: sortedMap(duplicateExtrasByWork, "work"),
  },
  translationCoverageByAuthor: group(nonFrench, (row) => row.metadata?.author).map((entry) => {
    const authorRows = nonFrench.filter((row) => (row.metadata?.author || "Non renseigné") === entry.label);
    const translated = authorRows.filter((row) => normalize(row.content_fr).length > 0).length;
    return {
      author: entry.label,
      nonFrench: authorRows.length,
      translated,
      untranslated: authorRows.length - translated,
      coverage: Number((translated / authorRows.length).toFixed(4)),
    };
  }),
};

await mkdir("outputs/corpus-audit", { recursive: true });
await writeFile("outputs/corpus-audit/inventory.json", JSON.stringify(audit, null, 2), "utf8");
console.log(JSON.stringify(audit));
