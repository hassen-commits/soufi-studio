import Link from "next/link";
import { THEMES } from "@/lib/themes";
import { countCitationsByThemeMap } from "@soufi/db";

export const revalidate = 3600;
export const metadata = { title: "Thèmes" };

export default async function ThemesPage() {
  const counts = await countCitationsByThemeMap(
    THEMES.map((t) => ({ slug: t.slug, keywords: t.keywords })),
  );

  return (
    <div>
      <header className="mb-12 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-4 font-title text-5xl italic text-navy-700">Thèmes</h1>
        <p className="mt-3 text-sm text-navy-500">
          Explorer la sagesse par grands thèmes — chaque thème ouvre les passages du corpus.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((t) => {
          const count = counts[t.slug];
          return (
            <Link
              key={t.slug}
              href={`/themes/${t.slug}`}
              className="group block rounded-sm border border-gold/20 bg-white/60 p-7 transition hover:border-gold hover:bg-white"
            >
              <h3 className="font-title text-2xl italic text-navy-700 group-hover:text-navy-900">
                {t.title}
              </h3>
              <p className="mt-2 text-sm text-navy-500">{t.desc}</p>
              <div className="mt-4 flex items-baseline justify-between border-t border-gold/10 pt-4">
                <span className="text-xs uppercase tracking-widest text-gold-dark">
                  {count != null
                    ? `${count.toLocaleString("fr-FR")} passages`
                    : "Corpus indisponible"}
                </span>
                <span className="font-title text-sm italic text-gold-dark opacity-0 transition group-hover:opacity-100">
                  Explorer →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
