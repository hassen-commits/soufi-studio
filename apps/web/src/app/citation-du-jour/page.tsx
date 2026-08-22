import Link from "next/link";
import type { Metadata } from "next";
import { getCitationOfTheDay } from "@soufi/db";
import { formatSourceLabel } from "@/lib/citations";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Citation du jour",
  description:
    "Chaque jour, une parole choisie parmi les maîtres soufis : Rûmî, Ibn ʿArabî, Ghazâlî, Tustarî et la tradition vivante.",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function cleanText(s: string): string {
  return s
    .replace(/\t+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

export default async function CitationDuJourPage() {
  const today = new Date();
  let citation = null;
  try {
    citation = await getCitationOfTheDay(today);
  } catch {
    // Bibliothèque non disponible — fallback
  }

  return (
    <div className="space-y-16">
      <section className="py-12 text-center">
        <p className="text-xs uppercase tracking-widest text-gold">
          {formatDate(today)}
        </p>
        <h1 className="mt-3 font-title text-4xl italic text-navy-700 md:text-5xl">
          Citation du jour
        </h1>
        <div className="gold-divider" />
      </section>

      {citation ? (
        <article className="mx-auto max-w-prose space-y-10 px-4 text-center">
          <p
            className="citation-text text-2xl md:text-3xl text-navy-700"
            style={{ overflowWrap: "anywhere", lineHeight: 1.6 }}
          >
            « {cleanText(citation.text)} »
          </p>
          <div className="mx-auto h-px w-24 bg-gold/40" />
          <div className="space-y-1">
            <p className="font-title text-2xl italic text-gold-dark">
              {citation.authorLabel}
            </p>
            <p className="text-sm text-navy-400">
              {formatSourceLabel(citation.workFr ?? citation.work)}
            </p>
          </div>
        </article>
      ) : (
        <p className="text-center text-sm text-navy-500">
          Aucune citation disponible pour aujourd'hui.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-4 pt-10">
        <Link
          href="/bibliotheque"
          className="rounded-sm border border-gold bg-gold px-6 py-3 font-body text-xs uppercase tracking-widest text-navy-700 transition hover:bg-gold-dark hover:text-parchment"
        >
          Explorer la bibliothèque
        </Link>
        <Link
          href="/maitres"
          className="rounded-sm border border-navy-700 px-6 py-3 font-body text-xs uppercase tracking-widest text-navy-700 transition hover:bg-navy-700 hover:text-parchment"
        >
          Les maîtres
        </Link>
      </div>
    </div>
  );
}
