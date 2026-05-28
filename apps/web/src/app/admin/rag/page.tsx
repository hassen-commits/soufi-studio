import { redirect } from "next/navigation";
import { studioRagQuery, type MaitreKey, type RagSynthesisResult } from "@/lib/studio-api";
import { RagPrintButton } from "./print-button";
import "./print.css";

export const dynamic = "force-dynamic";

const MAITRES: { key: MaitreKey; label: string }[] = [
  { key: "rumi", label: "Rûmî" },
  { key: "ibn_arabi", label: "Ibn ʿArabî" },
  { key: "ghazali", label: "Al-Ghazâlî" },
  { key: "tustari", label: "Sahl al-Tustarî" },
  { key: "maitres_soufis", label: "Autres maîtres" },
];

async function askAction(formData: FormData) {
  "use server";
  const question = String(formData.get("question") ?? "").trim();
  const maitres = formData.getAll("maitres").map(String);
  if (!question) return;
  const params = new URLSearchParams();
  params.set("q", question);
  for (const m of maitres) params.append("m", m);
  redirect(`/admin/rag?${params.toString()}`);
}

function todayStr(): string {
  return new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Insère les passages cités [N] comme petits liens ancrés
function renderAnswerWithRefs(answer: string): React.ReactNode {
  const parts = answer.split(/(\[[0-9,\s]+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([0-9,\s]+)\]$/);
    if (m) {
      const nums = m[1]
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      return (
        <sup key={i} className="mx-0.5 text-gold-dark">
          [
          {nums.map((n, j) => (
            <span key={j}>
              {j > 0 ? "," : ""}
              <a href={`#src-${n}`} className="hover:underline">
                {n}
              </a>
            </span>
          ))}
          ]
        </sup>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default async function RagPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; m?: string | string[] }>;
}) {
  const params = await searchParams;
  const question = (params.q ?? "").trim();
  const selectedMaitres = Array.isArray(params.m)
    ? (params.m as MaitreKey[])
    : params.m
      ? [params.m as MaitreKey]
      : [];

  let result: RagSynthesisResult | null = null;
  let error: string | null = null;
  if (question) {
    try {
      result = await studioRagQuery({
        question,
        maitres: selectedMaitres.length > 0 ? selectedMaitres : undefined,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="space-y-10">
      <header className="rag-no-print">
        <h1 className="font-title text-4xl italic text-navy-700">RAG Soufi · Q&A</h1>
        <p className="mt-2 max-w-prose text-sm text-navy-500">
          Pose une question (ex : <em>« Quelle est la définition de la taqwâ selon
          al-Ghazâlî et al-Tustarî ? »</em>). Le moteur cherche les passages les plus
          proches dans le corpus pour chaque maître sélectionné, puis Claude
          synthétise une réponse en citant chaque passage [N].
        </p>
      </header>

      <form action={askAction} className="rag-no-print space-y-5 rounded-sm border border-gold/30 bg-white p-6">
        <div>
          <label htmlFor="question" className="block text-xs uppercase tracking-widest text-navy-500">
            Question
          </label>
          <textarea
            id="question"
            name="question"
            defaultValue={question}
            required
            minLength={8}
            maxLength={500}
            rows={3}
            placeholder="Quelle est la définition de la taqwâ selon..."
            className="mt-2 w-full rounded-sm border border-gold/30 bg-parchment/30 p-3 font-body text-base text-navy-700 focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <span className="block text-xs uppercase tracking-widest text-navy-500">
            Maîtres (laisse vide pour les 4 grands)
          </span>
          <div className="mt-2 flex flex-wrap gap-3">
            {MAITRES.map((m) => (
              <label key={m.key} className="flex items-center gap-2 text-sm text-navy-700">
                <input
                  type="checkbox"
                  name="maitres"
                  value={m.key}
                  defaultChecked={selectedMaitres.includes(m.key)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="rounded-sm border border-navy-700 bg-navy-700 px-6 py-2 text-xs uppercase tracking-widest text-parchment transition hover:bg-navy-500"
        >
          Interroger le corpus
        </button>
      </form>

      {error ? (
        <div className="rounded-sm border border-red-300 bg-red-50 p-6 text-sm text-red-800 rag-no-print">
          <strong>Erreur :</strong> {error}
        </div>
      ) : null}

      {result ? (
        <article className="rag-print-doc space-y-10">
          <header className="border-b border-gold/30 pb-6">
            <p className="text-xs uppercase tracking-widest text-gold">
              Soufi Studio · {todayStr()}
            </p>
            <h2 className="mt-2 font-title text-3xl italic text-navy-700">
              {result.question}
            </h2>
            <p className="mt-3 text-xs text-navy-500">
              Maîtres consultés :{" "}
              {result.maitres
                .map((m) => MAITRES.find((x) => x.key === m)?.label ?? m)
                .join(" · ")}{" "}
              · {result.sources.length} passage{result.sources.length > 1 ? "s" : ""} mobilisé
              {result.sources.length > 1 ? "s" : ""}
            </p>
          </header>

          <section>
            <h3 className="mb-4 font-title text-xl italic text-navy-700">Synthèse</h3>
            <div className="prose prose-stone max-w-none whitespace-pre-wrap text-base leading-relaxed text-navy-700">
              {renderAnswerWithRefs(result.answer)}
            </div>
          </section>

          {result.sources.length > 0 ? (
            <section>
              <h3 className="mb-4 font-title text-xl italic text-navy-700">
                Passages sources
              </h3>
              <ol className="space-y-5 text-sm">
                {result.sources.map((s) => (
                  <li
                    key={s.index}
                    id={`src-${s.index}`}
                    className="rounded-sm border-l-2 border-gold/40 bg-parchment/30 px-5 py-4"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-3 text-xs text-navy-400">
                      <span>
                        <strong className="text-gold-dark">[{s.index}]</strong>{" "}
                        <span className="font-title italic text-navy-700">
                          {s.maitreLabel}
                        </span>
                        {s.work ? <span> — {s.work}</span> : null}
                      </span>
                      <span>similarité {(s.similarity * 100).toFixed(0)}%</span>
                    </div>
                    <p className="whitespace-pre-wrap text-navy-700">{s.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <footer className="rag-no-print border-t border-gold/30 pt-6 text-xs text-navy-400">
            Synthèse générée par Claude à partir des passages du corpus pgvector
            (recherche sémantique). À relire avant diffusion.
          </footer>

          <div className="rag-no-print">
            <RagPrintButton />
          </div>
        </article>
      ) : null}
    </div>
  );
}
