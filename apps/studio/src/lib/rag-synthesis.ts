import { anthropic, CLAUDE_MODEL } from "./anthropic.js";
import { logger } from "./logger.js";
import { ragSearch, type RagHit } from "../agent/handlers/rag-search.js";

export type MaitreKey =
  | "rumi"
  | "ibn_arabi"
  | "ghazali"
  | "tustari"
  | "maitres_soufis";

export const MAITRE_LABEL: Record<MaitreKey, string> = {
  rumi: "Jalâl al-Dîn Rûmî",
  ibn_arabi: "Ibn ʿArabî",
  ghazali: "Al-Ghazâlî",
  tustari: "Sahl al-Tustarî",
  maitres_soufis: "Autres maîtres soufis",
};

export interface RagSourceEntry {
  /** Numéro [1], [2]... utilisé dans la réponse pour citer. */
  index: number;
  maitre: MaitreKey;
  maitreLabel: string;
  text: string;
  work?: string;
  similarity: number;
}

export interface RagSynthesisResult {
  question: string;
  maitres: MaitreKey[];
  answer: string;
  sources: RagSourceEntry[];
  /** Diagnostic — combien de chunks par maître on a trouvés. */
  hitCountByMaitre: Record<MaitreKey, number>;
}

export interface RagSynthesisOptions {
  question: string;
  /** Si vide, on cherche dans les 4 grands maîtres. */
  maitres?: MaitreKey[];
  /** Nombre de chunks par maître (défaut 4). */
  perMaitreLimit?: number;
}

const DEFAULT_MAITRES: MaitreKey[] = ["rumi", "ibn_arabi", "ghazali", "tustari"];

const SYNTHESIS_SYSTEM = `Tu es un érudit du soufisme et de la tradition islamique. On te fournit une question et une série de passages sourcés provenant de plusieurs grands maîtres spirituels. Ton rôle est de SYNTHÉTISER leurs enseignements pour répondre à la question.

Règles strictes :
1. Utilise UNIQUEMENT les passages fournis comme matière première — ne fabrique pas de citations, ne paraphrase pas en inventant.
2. Cite les passages en notant [N] où N est le numéro du passage utilisé. Plusieurs citations possibles : [2,5].
3. Structure ta réponse par maître ou par angle d'approche, selon ce qui éclaire le mieux la question.
4. Si un maître demandé n'a aucun passage pertinent fourni, dis-le clairement plutôt que d'inventer.
5. Conclus par une synthèse comparative en 2-3 phrases (ce qui rapproche/distingue les approches).
6. Style : sobre, érudit, en français soigné. Pas d'introduction du type "Voici la réponse" — entre directement dans le sujet.
7. Longueur cible : 400-700 mots.`;

function buildUserMessage(
  question: string,
  sources: RagSourceEntry[],
  maitres: MaitreKey[],
): string {
  const maitresLine = maitres.map((m) => MAITRE_LABEL[m]).join(", ");
  const passagesBlock = sources
    .map((s) => {
      const workSuffix = s.work ? ` — ${s.work}` : "";
      return `[${s.index}] ${s.maitreLabel}${workSuffix}\n${s.text.trim()}`;
    })
    .join("\n\n---\n\n");

  return `Question : ${question}

Maîtres concernés : ${maitresLine}

Passages sourcés (matière première pour ta synthèse) :

${passagesBlock}

Réponds à la question en citant les passages par leur numéro [N].`;
}

export async function ragSynthesis(
  opts: RagSynthesisOptions,
): Promise<RagSynthesisResult> {
  const maitres = opts.maitres && opts.maitres.length > 0 ? opts.maitres : DEFAULT_MAITRES;
  const perLimit = opts.perMaitreLimit ?? 4;

  logger.info(
    { question: opts.question.slice(0, 80), maitres, perLimit },
    "rag_synthesis start",
  );

  // 1. Recherche en parallèle pour chaque maître
  const hitsByMaitre: Record<MaitreKey, RagHit[]> = {} as Record<MaitreKey, RagHit[]>;
  await Promise.all(
    maitres.map(async (m) => {
      try {
        const hits = await ragSearch({
          query: opts.question,
          author: m,
          limit: perLimit,
        });
        hitsByMaitre[m] = hits;
      } catch (e) {
        logger.warn({ maitre: m, error: String(e) }, "rag_synthesis search failed");
        hitsByMaitre[m] = [];
      }
    }),
  );

  // 2. Aplatir en sources numérotées (regroupées par maître pour la lisibilité)
  const sources: RagSourceEntry[] = [];
  for (const m of maitres) {
    for (const h of hitsByMaitre[m] ?? []) {
      sources.push({
        index: sources.length + 1,
        maitre: m,
        maitreLabel: MAITRE_LABEL[m],
        text: h.content,
        work: h.work,
        similarity: h.similarity,
      });
    }
  }

  const hitCountByMaitre = maitres.reduce(
    (acc, m) => {
      acc[m] = (hitsByMaitre[m] ?? []).length;
      return acc;
    },
    {} as Record<MaitreKey, number>,
  );

  if (sources.length === 0) {
    return {
      question: opts.question,
      maitres,
      answer:
        "Aucun passage pertinent trouvé dans le corpus pour cette question. Reformule ou élargis la liste des maîtres.",
      sources: [],
      hitCountByMaitre,
    };
  }

  // 3. Synthèse Claude
  const userMessage = buildUserMessage(opts.question, sources, maitres);
  const completion = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: SYNTHESIS_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const answer = completion.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");

  logger.info(
    {
      sources: sources.length,
      hitCountByMaitre,
      tokens: completion.usage,
    },
    "rag_synthesis done",
  );

  return {
    question: opts.question,
    maitres,
    answer,
    sources,
    hitCountByMaitre,
  };
}
