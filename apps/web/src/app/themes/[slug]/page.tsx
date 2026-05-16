import Link from "next/link";
import { notFound } from "next/navigation";
import { listCitationsByTheme, countCitationsByTheme } from "@soufi/db";
import { CitationCard } from "@/components/citation-card";
import { THEMES, getTheme } from "@/lib/themes";

export const revalidate = 600;

export async function generateStaticParams() {
  return THEMES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = getTheme(slug);
  if (!theme) return { title: "Thème" };
  return {
    title: theme.title,
    description: theme.desc,
  };
}

export default async function ThemeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const theme = getTheme(slug);
  if (!theme) notFound();

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize = 24;

  let citations: Awaited<ReturnType<typeof listCitationsByTheme>> = [];
  let total: number | null = null;
  let error: string | null = null;

  try {
    [citations, total] = await Promise.all([
      listCitationsByTheme(theme.keywords, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      countCitationsByTheme(theme.keywords),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Erreur de connexion à la bibliothèque";
  }

  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div>
      <nav className="mb-8 text-center text-xs uppercase tracking-widest text-navy-400">
        <Link href="/themes" className="hover:text-gold-dark">
          ← Tous les thèmes
        </Link>
      </nav>

      <header className="mb-12 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-4 font-title text-5xl italic text-navy-700">{theme.title}</h1>
        <p className="mt-3 text-sm text-navy-500">{theme.desc}</p>
      </header>

      <section className="mx-auto mb-12 max-w-3xl rounded-sm border border-gold/20 bg-white/40 p-8">
        <p className="font-body text-base leading-relaxed text-navy-600">{theme.longDesc}</p>
        {theme.epigraph ? (
          <>
            <div className="gold-divider my-6" />
            <p className="font-title text-lg italic text-gold-dark">
              « {theme.epigraph.text} »
            </p>
            <p className="mt-1 text-right text-xs uppercase tracking-widest text-navy-400">
              — {theme.epigraph.author}
            </p>
          </>
        ) : null}
      </section>

      <div className="mb-8 text-center text-xs uppercase tracking-widest text-gold-dark">
        {total !== null
          ? `${total.toLocaleString("fr-FR")} passages dans le corpus`
          : null}
      </div>

      {error ? (
        <div className="rounded-sm border border-gold/20 bg-white/40 p-10 text-center">
          <p className="font-title text-xl italic text-navy-600">{error}</p>
        </div>
      ) : citations.length === 0 ? (
        <p className="text-center font-title text-xl italic text-navy-500">
          Aucun passage trouvé pour ce thème dans le corpus actuel.
        </p>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {citations.map((c) => (
              <CitationCard key={c.id} citation={c} />
            ))}
          </div>
          <Pagination slug={slug} page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}

function Pagination({
  slug,
  page,
  totalPages,
}: {
  slug: string;
  page: number;
  totalPages: number;
}) {
  const href = (p: number) =>
    `/themes/${slug}${p > 1 ? `?page=${p}` : ""}`;
  return (
    <nav className="mt-12 flex justify-center gap-4 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="text-navy-600 hover:text-gold-dark">
          ← Page précédente
        </Link>
      ) : (
        <span className="text-navy-300">← Page précédente</span>
      )}
      <span className="text-navy-400">
        Page {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="text-navy-600 hover:text-gold-dark">
          Page suivante →
        </Link>
      ) : (
        <span className="text-navy-300">Page suivante →</span>
      )}
    </nav>
  );
}
