import Link from "next/link";
import { notFound } from "next/navigation";
import { MAITRE_BY_KEY, MAITRES, type AuthorKey, type Citation } from "@soufi/content";
import { listCitations } from "@soufi/db";
import { CitationCard } from "@/components/citation-card";

export const revalidate = 3600;

export function generateStaticParams() {
  return MAITRES.map((m) => ({ slug: m.key }));
}

/**
 * Rejette les chunks qui sont visiblement des artefacts d'OCR/édition :
 * footnotes, références de manuscrits, pages d'index, fragments de
 * bibliographie. Souvent concentré dans le corpus Tustarî (issu du PDF
 * Keeler/Fons Vitae avec son apparat critique).
 */
function looksLikeNoise(text: string): boolean {
  const t = text.trim();
  // Commence par un numéro de footnote isolé (« 4 Again, it should... »)
  if (/^\d{1,3}\s+[A-Z]/.test(t)) return true;
  // Références à des manuscrits / folios / éditions critiques
  if (/\bMSS?\b|\bf\.\s+\d|\bed\.\s|\bff\.\s+\d/.test(t)) return true;
  if (/[A-Z]\d{2,4}[a-z]?\b/.test(t)) return true; // codes type Z515, F638a
  // Pages d'index / glossaire : suite de termes séparés par virgules avec
  // chiffres romains ou pages
  if (/,\s+(?:[ivxlcd]+|\d+)(?:\s*,\s*(?:[ivxlcd]+|\d+))+/i.test(t)) return true;
  // Mentions d'éditeur / institut = page biblio
  if (/\b(Fons Vitae|de Gruyter|Brill|Royal Aal|Institute for Islamic)\b/.test(t)) return true;
  // Crochets éditoriaux nombreux : « his [lower] self ... [completely] buries »
  const bracketCount = (t.match(/\[[a-z]+\]/g) ?? []).length;
  if (bracketCount >= 2) return true;
  return false;
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
    // Fetch plus large + filtre anti-bruit, on garde les 12 premiers extraits propres.
    const pool = await listCitations({ author: maitre.key, limit: 80 });
    citations = pool.filter((c) => !looksLikeNoise(c.text)).slice(0, 12);
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
        {maitre.bioLong ? (
          <div className="space-y-5 text-base leading-relaxed text-navy-700">
            {maitre.bioLong.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
          </div>
        ) : (
          <p className="text-base leading-relaxed text-navy-700">{maitre.bio}</p>
        )}

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

        {maitre.bibliography && maitre.bibliography.length > 0 ? (
          <>
            <div className="gold-divider" />
            <h2 className="text-center font-title text-2xl italic text-navy-700">
              Pour aller plus loin
            </h2>
            <p className="mt-2 text-center text-xs uppercase tracking-widest text-navy-400">
              Éditions, traductions et études de référence
            </p>
            <ul className="mt-8 space-y-6">
              {maitre.bibliography.map((b, i) => (
                <li
                  key={i}
                  className="rounded-sm border-l-2 border-gold/40 bg-white/40 px-5 py-4"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold text-navy-700">
                      {b.author}
                    </span>
                    {b.lang ? (
                      <span className="rounded-full bg-parchment/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold-dark">
                        {b.lang === "fr" ? "français" : b.lang === "en" ? "anglais" : "arabe"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-title text-lg italic text-navy-700">
                    {b.title}
                  </p>
                  {b.publisher || b.year ? (
                    <p className="mt-1 text-xs text-navy-500">
                      {b.publisher}
                      {b.publisher && b.year ? ", " : ""}
                      {b.year}
                    </p>
                  ) : null}
                  {b.note ? (
                    <p className="mt-2 text-sm leading-relaxed text-navy-600">
                      {b.note}
                    </p>
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
