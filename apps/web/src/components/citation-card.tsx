import Link from "next/link";
import type { Citation } from "@soufi/content";

export function CitationCard({ citation }: { citation: Citation }) {
  const href = `/citations/${citation.author}/${citation.slug}`;
  const cleaned = cleanText(citation.text);
  return (
    <Link
      href={href}
      className="group block rounded-sm border border-gold/20 bg-white/60 p-7 transition hover:border-gold hover:bg-white"
    >
      <p
        className="citation-text text-citation-sm break-words group-hover:text-navy-700"
        style={{ overflowWrap: "anywhere" }}
      >
        « {truncate(cleaned, 220)} »
      </p>
      <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-gold/10 pt-4">
        <span className="font-title text-lg italic text-gold-dark">{citation.authorLabel}</span>
        {citation.workFr || citation.work ? (
          <span className="truncate text-xs text-navy-400">{citation.workFr ?? citation.work}</span>
        ) : null}
      </div>
    </Link>
  );
}

// Nettoie les artefacts d'extraction PDF avant affichage :
// - tabulations → espaces
// - sauts de ligne multiples → un seul
// - espaces multiples → un seul
function cleanText(s: string): string {
  return s
    .replace(/\t+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}
