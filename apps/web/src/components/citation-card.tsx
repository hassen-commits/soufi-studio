import Link from "next/link";
import type { Citation } from "@soufi/content";
import { cleanCitationText, formatWorkTitle } from "@/lib/citations";

export function CitationCard({ citation }: { citation: Citation }) {
  const href = `/citations/${citation.author}/${citation.slug}`;
  const cleaned = cleanCitationText(citation.text);
  const workTitle = formatWorkTitle(citation.workFr ?? citation.work);
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
      <div className="mt-5 flex items-start justify-between gap-4 border-t border-gold/10 pt-4">
        <span className="shrink-0 whitespace-nowrap font-title text-lg italic text-gold-dark">{citation.authorLabel}</span>
        {workTitle ? (
          <span className="min-w-0 text-right text-xs leading-relaxed text-navy-400" title={workTitle}>{workTitle}</span>
        ) : null}
      </div>
    </Link>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}
