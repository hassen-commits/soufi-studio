import Link from "next/link";

const NAV = [
  { href: "/citation-du-jour", label: "Citation du jour" },
  { href: "/bibliotheque", label: "Bibliothèque" },
  { href: "/maitres", label: "Maîtres" },
  { href: "/episodes", label: "Épisodes" },
  { href: "/themes", label: "Thèmes" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-gold/20 bg-parchment/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-title text-2xl italic text-navy-700">Soufi</span>
          <span className="font-title text-2xl text-gold">Studio</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-body text-navy-600 transition hover:text-gold-dark"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/recherche"
            aria-label="Rechercher dans le corpus"
            className="font-body text-navy-500 transition hover:text-gold-dark"
          >
            ⌕
          </Link>
        </nav>
      </div>
    </header>
  );
}
