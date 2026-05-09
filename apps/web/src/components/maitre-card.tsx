import Link from "next/link";
import type { Maitre } from "@soufi/content";

export function MaitreCard({ maitre, count }: { maitre: Maitre; count?: number }) {
  return (
    <Link
      href={`/maitres/${maitre.key}`}
      className="group block rounded-sm border border-gold/20 bg-white/60 p-8 transition hover:border-gold hover:bg-white"
    >
      <h3 className="font-title text-3xl text-navy-700 group-hover:text-gold-dark">
        {maitre.name}
      </h3>
      <p className="mt-1 font-title text-sm italic text-navy-400">
        {maitre.fullName}
      </p>
      <p className="mt-2 text-xs uppercase tracking-widest text-gold">
        {maitre.birth ?? "?"} – {maitre.death ?? "?"} · {maitre.origin}
      </p>
      <p className="mt-5 text-sm leading-relaxed text-navy-600">{maitre.bio}</p>
      {count !== undefined ? (
        <p className="mt-5 text-xs text-navy-400">
          {count.toLocaleString("fr-FR")} extraits dans la bibliothèque
        </p>
      ) : null}
    </Link>
  );
}
