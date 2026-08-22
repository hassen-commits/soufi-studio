import Link from "next/link";
import { MAITRES, type Citation } from "@soufi/content";
import {
  getRandomCitations,
  countCitationsByAuthor,
  getCitationOfTheDay,
} from "@soufi/db";
import { CitationCard } from "@/components/citation-card";
import { JsonLd } from "@/components/json-ld";
import { cleanCitationText, formatWorkTitle } from "@/lib/citations";

export const revalidate = 3600;

export default async function HomePage() {
  let citations: Citation[] = [];
  let counts: Record<string, number> = {};
  let citationDuJour: Citation | null = null;
  try {
    [citations, counts, citationDuJour] = await Promise.all([
      getRandomCitations(6),
      countCitationsByAuthor(),
      getCitationOfTheDay(),
    ]);
  } catch {
    // Pas de connexion Supabase configurée — on affiche le site sans les données
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-24">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Soufi Studio",
          url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.iavance.fr",
          description: "Bibliothèque francophone de la sagesse soufie.",
          potentialAction: {
            "@type": "SearchAction",
            target: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.iavance.fr"}/recherche?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <section className="py-16 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-6 font-title text-6xl italic text-navy-700 md:text-7xl">
          Le souffle des maîtres
        </h1>
        <p className="mx-auto mt-6 max-w-narrow font-title text-2xl italic text-gold-light">
          « Ne sois pas satisfait des histoires qui sont arrivées avant toi.
          Découvre ta propre légende. »
        </p>
        <p className="mt-2 text-xs uppercase tracking-widest text-navy-400">— Rûmî</p>

        <div className="gold-divider" />

        <p className="mx-auto max-w-prose text-base leading-relaxed text-navy-600">
          Une bibliothèque vivante de la sagesse soufie, transmise en français.
          Rûmî, Ibn ʿArabî, al-Ghazâlî, al-Tustarî et les grands maîtres de la
          tradition islamique réunis en un même lieu de lecture, d'écoute et
          de méditation.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/bibliotheque"
            className="rounded-sm border border-gold bg-gold px-6 py-3 font-body text-sm uppercase tracking-widest text-navy-700 transition hover:bg-gold-dark hover:text-parchment"
          >
            Entrer dans la bibliothèque
          </Link>
          <Link
            href="/episodes"
            className="rounded-sm border border-navy-700 px-6 py-3 font-body text-sm uppercase tracking-widest text-navy-700 transition hover:bg-navy-700 hover:text-parchment"
          >
            Écouter les épisodes
          </Link>
        </div>
      </section>

      {citationDuJour ? (
        <section className="mx-auto max-w-3xl rounded-sm border border-gold/30 bg-white/70 px-8 py-12 text-center shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gold">Citation du jour</p>
          <div className="mt-4 gold-divider" />
          <p
            className="citation-text mt-2 text-xl italic text-navy-700 md:text-2xl"
            style={{ overflowWrap: "anywhere", lineHeight: 1.6 }}
          >
            « {cleanCitationText(citationDuJour.text)} »
          </p>
          <div className="mt-6 mx-auto h-px w-20 bg-gold/40" />
          <p className="mt-4 font-title text-xl italic text-gold-dark">
            {citationDuJour.authorLabel}
          </p>
          {citationDuJour.workFr || citationDuJour.work ? (
            <p className="mt-1 text-xs text-navy-400">
              {formatWorkTitle(citationDuJour.workFr ?? citationDuJour.work)}
            </p>
          ) : null}
          <div className="mt-6">
            <Link
              href="/citation-du-jour"
              className="text-xs uppercase tracking-widest text-gold-dark hover:text-navy-700"
            >
              Voir en grand →
            </Link>
          </div>
        </section>
      ) : null}

      {citations.length > 0 ? (
        <section>
          <h2 className="mb-8 text-center font-title text-3xl italic text-navy-700">
            Quelques perles, au hasard
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {citations.map((c) => (
              <CitationCard key={c.id} citation={c} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-sm border border-gold/20 bg-white/40 p-10 text-center">
          <p className="font-title text-xl italic text-navy-600">
            La bibliothèque attend sa connexion à Supabase.
          </p>
          <p className="mt-2 text-sm text-navy-500">
            Renseigner <code className="text-gold-dark">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
            <code className="text-gold-dark">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans{" "}
            <code className="text-gold-dark">.env</code> pour voir les citations apparaître.
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-8 text-center font-title text-3xl italic text-navy-700">
          Les maîtres
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {MAITRES.map((m) => (
            <Link
              key={m.key}
              href={`/maitres/${m.key}`}
              className="group block rounded-sm border border-gold/20 bg-white/60 p-6 transition hover:border-gold hover:bg-white"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-title text-2xl italic text-navy-700 group-hover:text-gold-dark">
                  {m.name}
                </h3>
                {counts[m.key] !== undefined ? (
                  <span className="text-xs text-navy-400">
                    {counts[m.key]?.toLocaleString("fr-FR")} extraits
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs uppercase tracking-widest text-gold">
                {m.birth ?? "?"} – {m.death ?? "?"} · {m.origin}
              </p>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-navy-600">
                {m.bio}
              </p>
            </Link>
          ))}
        </div>
        {total > 0 ? (
          <p className="mt-6 text-center text-xs uppercase tracking-widest text-navy-400">
            {total.toLocaleString("fr-FR")} extraits dans le corpus
          </p>
        ) : null}
      </section>
    </div>
  );
}
