import Link from "next/link";
import { searchCitations, countCitationsMatching } from "@soufi/db";
import { CitationCard } from "@/components/citation-card";

export const revalidate = 60;

export const metadata = { title: "Recherche" };

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize = 24;

  let citations: Awaited<ReturnType<typeof searchCitations>> = [];
  let total: number | null = null;
  let error: string | null = null;

  if (query.length >= 2) {
    try {
      [citations, total] = await Promise.all([
        searchCitations(query, {
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        countCitationsMatching(query),
      ]);
    } catch (e) {
      error = e instanceof Error ? e.message : "Erreur de recherche";
    }
  }

  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div>
      <header className="mb-10 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-4 font-title text-5xl italic text-navy-700">Recherche</h1>
        <p className="mt-3 text-sm text-navy-500">
          Trouver un mot, une intuition, un nom dans le corpus.
        </p>
      </header>

      <form action="/recherche" method="get" className="mx-auto mb-12 max-w-xl">
        <div className="flex items-center gap-3 rounded-sm border border-gold/30 bg-white/70 px-5 py-3 focus-within:border-gold">
          <span className="text-gold-dark">⌕</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="silence, patience, sabr, lumière…"
            autoFocus
            minLength={2}
            className="flex-1 bg-transparent font-body text-navy-700 outline-none placeholder:italic placeholder:text-navy-300"
          />
          <button
            type="submit"
            className="rounded-full border border-gold bg-gold/10 px-4 py-1 text-xs uppercase tracking-widest text-navy-700 hover:bg-gold"
          >
            Chercher
          </button>
        </div>
      </form>

      {query.length === 0 ? (
        <Suggestions />
      ) : query.length < 2 ? (
        <p className="text-center font-title text-lg italic text-navy-500">
          Au moins deux caractères, s'il te plaît.
        </p>
      ) : error ? (
        <div className="rounded-sm border border-gold/20 bg-white/40 p-10 text-center">
          <p className="font-title text-xl italic text-navy-600">{error}</p>
        </div>
      ) : (
        <>
          <p className="mb-8 text-center text-xs uppercase tracking-widest text-gold-dark">
            {total !== null
              ? `${total.toLocaleString("fr-FR")} passage${total > 1 ? "s" : ""} pour « ${query} »`
              : "Recherche…"}
          </p>

          {citations.length === 0 ? (
            <p className="text-center font-title text-xl italic text-navy-500">
              Aucun passage ne contient « {query} » dans le corpus actuel.
            </p>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {citations.map((c) => (
                  <CitationCard key={c.id} citation={c} />
                ))}
              </div>
              <Pagination q={query} page={page} totalPages={totalPages} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Suggestions() {
  const samples = ["silence", "lumière", "sabr", "amour", "Rûmî", "Ibn Arabi", "nuit"];
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm text-navy-500">Quelques mots pour commencer :</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {samples.map((s) => (
          <Link
            key={s}
            href={`/recherche?q=${encodeURIComponent(s)}`}
            className="rounded-full border border-gold/30 px-4 py-1.5 text-xs italic text-gold-dark hover:border-gold hover:text-navy-700"
          >
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Pagination({
  q,
  page,
  totalPages,
}: {
  q: string;
  page: number;
  totalPages: number;
}) {
  const href = (p: number) => {
    const params = new URLSearchParams({ q });
    if (p > 1) params.set("page", String(p));
    return `/recherche?${params.toString()}`;
  };
  return (
    <nav className="mt-12 flex justify-center gap-4 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="text-navy-600 hover:text-gold-dark">
          ← Page précédente
        </Link>
      ) : (
        <span className="text-navy-300">← Page précédente</span>
      )}
      <span className="text-navy-400">
        Page {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="text-navy-600 hover:text-gold-dark">
          Page suivante →
        </Link>
      ) : (
        <span className="text-navy-300">Page suivante →</span>
      )}
    </nav>
  );
}
