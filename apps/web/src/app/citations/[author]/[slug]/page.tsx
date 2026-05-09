import Link from "next/link";
import { notFound } from "next/navigation";
import { MAITRE_BY_KEY, type AuthorKey } from "@soufi/content";
import { listCitations } from "@soufi/db";

export const revalidate = 3600;

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
