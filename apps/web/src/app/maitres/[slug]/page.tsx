import Link from "next/link";
import { notFound } from "next/navigation";
import { MAITRE_BY_KEY, MAITRES, type AuthorKey, type Citation } from "@soufi/content";
import { listCitations } from "@soufi/db";
import { CitationCard } from "@/components/citation-card";

export const revalidate = 3600;

export function generateStaticParams() {
  return MAITRES.map((m) => ({ slug: m.key }));
}

export default async function MaitrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const maitre = MAITRE_BY_KEY[slug as AuthorKey];
  if (!maitre) notFound();

  let citations: Citation[] = [];
  try {
    citations = await listCitations({ author: maitre.key, limit: 12 });
  } catch {
    // ignore
  }

  return (
    <article>
      <header className="mb-12 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-4 font-title text-6xl italic text-navy-700">{maitre.name}</h1>
        <p className="mt-2 font-title text-lg italic text-navy-500">{maitre.fullName}</p>
        <p className="mt-3 text-xs uppercase tracking-widest text-gold">
          {maitre.birth ?? "?"} – {maitre.death ?? "?"} · {maitre.origin}
        </p>
      </header>

      <section className="mx-auto max-w-prose">
        <p className="text-base leading-relaxed text-navy-700">{maitre.bio}</p>

        {maitre.works.length > 0 ? (
          <>
            <div className="gold-divider" />
            <h2 className="text-center font-title text-2xl italic text-navy-700">Œuvres</h2>
            <ul className="mt-6 space-y-3 text-center">
              {maitre.works.map((w) => (
                <li key={w.title} className="text-navy-600">
                  <span className="font-title italic">{w.title}</span>
                  {w.titleFr ? (
                    <span className="text-navy-400"> — {w.titleFr}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <div className="gold-divider" />

      <section>
        <h2 className="mb-8 text-center font-title text-3xl italic text-navy-700">
          Quelques extraits
        </h2>
        {citations.length === 0 ? (
          <p className="text-center text-sm text-navy-500">
            Les extraits apparaîtront dès la connexion à la base.
          </p>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              {citations.map((c) => (
                <CitationCard key={c.id} citation={c} />
              ))}
            </div>
            <p className="mt-8 text-center">
              <Link
                href={`/bibliotheque?auteur=${maitre.key}`}
                className="text-sm uppercase tracking-widest text-gold-dark hover:text-navy-700"
              >
                Lire tous les extraits →
              </Link>
            </p>
          </>
        )}
      </section>
    </article>
  );
}
