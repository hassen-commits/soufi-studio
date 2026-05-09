import Link from "next/link";
import type { Citation } from "@soufi/content";

export function CitationCard({ citation }: { citation: Citation }) {
  const href = `/citations/${citation.author}/${citation.slug}`;
  return (
    <Link
      href={href}
      className="group block rounded-sm border border-gold/20 bg-white/60 p-7 transition hover:border-gold hover:bg-white"
    >
      <p className="citation-text text-citation-sm group-hover:text-navy-700">
        « {truncate(citation.text, 220)} »
      </p>
      <div className="mt-5 flex items-baseline justify-between border-t border-gold/10 pt-4">
        <span className="font-title text-lg italic text-gold-dark">{citation.authorLabel}</span>
        {citation.workFr || citation.work ? (
          <span className="text-xs text-navy-400">{citation.workFr ?? citation.work}</span>
        ) : null}
      </div>
    </Link>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}
