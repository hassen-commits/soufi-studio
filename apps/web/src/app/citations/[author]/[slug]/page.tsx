import Link from "next/link";
import { notFound } from "next/navigation";
import { MAITRE_BY_KEY, type AuthorKey } from "@soufi/content";
import { listCitations } from "@soufi/db";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.iavance.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ author: string; slug: string }>;
}) {
  const { author, slug } = await params;
  const maitre = MAITRE_BY_KEY[author as AuthorKey];
  if (!maitre) return { title: "Citation" };

  // On récupère le texte pour l'image OG (best-effort — pas bloquant)
  let citationText: string | undefined;
  let citationWork: string | undefined;
  try {
    const candidates = await listCitations({ author: maitre.key, limit: 200 });
    const c = candidates.find((x) => x.slug === slug);
    if (c) {
      citationText = c.text;
      citationWork = c.workFr ?? c.work;
    }
  } catch {
    // ignore
  }

  const ogTitle = citationText ?? `${maitre.name} — citation`;
  const og = ogImageUrl({
    type: "citation",
    title: ogTitle,
    author: maitre.fullName,
    work: citationWork,
  });

  return {
    title: `${maitre.name} — citation`,
    description: citationText
      ? `« ${citationText.slice(0, 200)}${citationText.length > 200 ? "…" : ""} »`
      : `Extrait de ${maitre.fullName}.`,
    openGraph: {
      type: "article",
      url: `${SITE_URL}/citations/${author}/${slug}`,
      images: [{ url: og, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function CitationPage({
  params,
}: {
  params: Promise<{ author: string; slug: string }>;
}) {
  const { author, slug } = await params;
  const maitre = MAITRE_BY_KEY[author as AuthorKey];
  if (!maitre) notFound();

  let citation = null;
  try {
    const candidates = await listCitations({ author: maitre.key, limit: 200 });
    citation = candidates.find((c) => c.slug === slug);
  } catch {
    // ignore
  }

  if (!citation) {
    return (
      <div className="py-24 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-6 font-title text-3xl italic text-navy-600">
          Citation introuvable
        </h1>
        <p className="mt-3 text-sm text-navy-500">
          Cet extrait n'existe pas (encore) dans notre bibliothèque.
        </p>
        <p className="mt-8">
          <Link
            href={`/maitres/${maitre.key}`}
            className="text-sm uppercase tracking-widest text-gold-dark hover:text-navy-700"
          >
            ← Retour à {maitre.name}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-narrow py-12 text-center">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Quotation",
          text: citation.text,
          inLanguage: citation.language ?? "fr",
          creator: {
            "@type": "Person",
            name: maitre.fullName,
            alternateName: maitre.name,
          },
          ...(citation.workFr || citation.work
            ? {
                isPartOf: {
                  "@type": "Book",
                  name: citation.workFr ?? citation.work,
                },
              }
            : {}),
          url: `${SITE_URL}/citations/${author}/${slug}`,
          publisher: { "@type": "Organization", name: "Soufi Studio" },
        }}
      />

      <Link
        href={`/maitres/${maitre.key}`}
        className="text-xs uppercase tracking-widest text-gold-dark hover:text-navy-700"
      >
        {maitre.name}
      </Link>

      <p className="ornament mt-8">۞</p>

      <blockquote className="mt-10 citation-text text-citation-lg text-navy-700">
        « {citation.text} »
      </blockquote>

      <div className="gold-divider" />

      <footer className="space-y-1 text-sm text-navy-500">
        <p className="font-title italic text-gold-dark">— {maitre.fullName}</p>
        {citation.workFr || citation.work ? (
          <p className="text-xs">{citation.workFr ?? citation.work}</p>
        ) : null}
      </footer>

      <div className="mt-16">
        <Link
          href="/bibliotheque"
          className="text-xs uppercase tracking-widest text-navy-500 hover:text-gold-dark"
        >
          ← Retour à la bibliothèque
        </Link>
      </div>
    </article>
  );
}
