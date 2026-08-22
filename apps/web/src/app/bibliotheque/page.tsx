import Link from "next/link";
import { MAITRES, type AuthorKey, type Citation } from "@soufi/content";
import { countCitationsByAuthor, listCitations } from "@soufi/db";
import { CitationCard } from "@/components/citation-card";

export const revalidate = 600;

export default async function BibliothequePage({
  searchParams,
}: {
  searchParams: Promise<{ auteur?: string; page?: string }>;
}) {
  const params = await searchParams;
  const author = (params.auteur ?? undefined) as AuthorKey | undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 24;

  let citations: Citation[] = [];
  let error: string | null = null;
  let total: number | null = null;
  try {
    const [items, counts] = await Promise.all([
      listCitations({ author, limit: pageSize, offset: (page - 1) * pageSize }),
      countCitationsByAuthor(),
    ]);
    citations = items;
    total = author ? counts[author] ?? 0 : Object.values(counts).reduce((sum, n) => sum + n, 0);
  } catch (e) {
    error = e instanceof Error ? e.message : "Erreur de connexion à la bibliothèque";
  }

  return (
    <div>
      <header className="mb-12 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-4 font-title text-5xl italic text-navy-700">Bibliothèque</h1>
        <p className="mt-3 text-sm text-navy-500">
          {total !== null
            ? `${total.toLocaleString("fr-FR")} extraits des grands maîtres de la tradition soufie.`
            : "Des milliers d’extraits des grands maîtres de la tradition soufie."}
        </p>
      </header>

      <nav className="mb-12 flex flex-wrap justify-center gap-2 text-sm">
        <Link
          href="/bibliotheque"
          className={filterClass(!author)}
        >
          Tous les maîtres
        </Link>
        {MAITRES.map((m) => (
          <Link
            key={m.key}
            href={`/bibliotheque?auteur=${m.key}`}
            className={filterClass(author === m.key)}
          >
            {m.name}
          </Link>
        ))}
      </nav>

      {error ? (
        <div className="rounded-sm border border-gold/20 bg-white/40 p-10 text-center">
          <p className="font-title text-xl italic text-navy-600">{error}</p>
          <p className="mt-2 text-sm text-navy-500">
            Renseigne tes credentials Supabase dans le fichier <code>.env</code>.
          </p>
        </div>
      ) : citations.length === 0 ? (
        <p className="text-center font-title text-xl italic text-navy-500">
          Aucune citation pour ce filtre.
        </p>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {citations.map((c) => (
              <CitationCard key={c.id} citation={c} />
            ))}
          </div>
          <Pagination page={page} hasMore={citations.length === pageSize} author={author} />
        </>
      )}
    </div>
  );
}

function filterClass(active: boolean): string {
  const base = "rounded-full border px-4 py-1.5 font-body uppercase tracking-widest text-xs transition";
  return active
    ? `${base} border-gold bg-gold text-navy-700`
    : `${base} border-gold/30 text-navy-500 hover:border-gold hover:text-navy-700`;
}

function Pagination({
  page,
  hasMore,
  author,
}: {
  page: number;
  hasMore: boolean;
  author?: AuthorKey;
}) {
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (author) params.set("auteur", author);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/bibliotheque${s ? `?${s}` : ""}`;
  };
  return (
    <nav className="mt-12 flex justify-center gap-4 text-sm">
      {page > 1 ? (
        <Link href={qs(page - 1)} className="text-navy-600 hover:text-gold-dark">
          ← Page précédente
        </Link>
      ) : (
        <span className="text-navy-300">← Page précédente</span>
      )}
      <span className="text-navy-400">Page {page}</span>
      {hasMore ? (
        <Link href={qs(page + 1)} className="text-navy-600 hover:text-gold-dark">
          Page suivante →
        </Link>
      ) : (
        <span className="text-navy-300">Page suivante →</span>
      )}
    </nav>
  );
}
