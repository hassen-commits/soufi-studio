const THEMES = [
  { slug: "amour-divin", title: "L'Amour divin", desc: "Le souffle qui meut toute chose." },
  { slug: "tawhid", title: "Le Tawḥîd", desc: "L'unicité au cœur de la quête." },
  { slug: "patience", title: "La patience", desc: "La voie longue et certaine." },
  { slug: "silence", title: "Le silence", desc: "Là où l'âme entend." },
  { slug: "voyage", title: "Le voyage intérieur", desc: "La marche du cœur vers l'Origine." },
  { slug: "lumiere", title: "La Lumière", desc: "Mishkât al-Anwâr." },
];

export const metadata = { title: "Thèmes" };

export default function ThemesPage() {
  return (
    <div>
      <header className="mb-12 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-4 font-title text-5xl italic text-navy-700">Thèmes</h1>
        <p className="mt-3 text-sm text-navy-500">Explorer la sagesse par grands thèmes.</p>
      </header>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((t) => (
          <div
            key={t.slug}
            className="rounded-sm border border-gold/20 bg-white/60 p-7"
          >
            <h3 className="font-title text-2xl italic text-navy-700">{t.title}</h3>
            <p className="mt-2 text-sm text-navy-500">{t.desc}</p>
            <p className="mt-4 text-xs uppercase tracking-widest text-navy-300">
              Bientôt
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
