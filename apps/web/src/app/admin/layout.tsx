import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/episodes", label: "Épisodes" },
  { href: "/admin/produce", label: "Produire" },
];

async function logoutAction() {
  "use server";
  const jar = await cookies();
  jar.delete("admin_session");
  redirect("/admin/login");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const isAuth = jar.get("admin_session")?.value === process.env.ADMIN_TOKEN;

  return (
    <div className="-mx-6 -my-12 min-h-screen bg-white">
      {isAuth ? (
        <header className="border-b border-gold/30 bg-navy-700">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/admin" className="font-title text-xl italic text-gold">
              Soufi Admin
            </Link>
            <nav className="flex items-center gap-6 text-sm">
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
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-xs uppercase tracking-widest text-gold/70 hover:text-gold"
                >
                  Déconnexion
                </button>
              </form>
            </nav>
          </div>
        </header>
      ) : null}
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
