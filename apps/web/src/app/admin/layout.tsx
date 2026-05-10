import Link from "next/link";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/episodes", label: "Épisodes" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 -my-12 min-h-screen bg-white">
      <header className="border-b border-gold/30 bg-navy-700">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-title text-xl italic text-gold">
            Soufi Admin
          </Link>
          <nav className="flex gap-6 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-parchment transition hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="text-xs uppercase tracking-widest text-gold/70 hover:text-gold"
            >
              ← Site public
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
