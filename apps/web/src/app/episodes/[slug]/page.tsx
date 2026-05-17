import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedEpisode } from "@soufi/db";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";

export const revalidate = 600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.iavance.fr";

function isoDuration(sec: number | null): string | undefined {
  if (!sec) return undefined;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `PT${m}M${s}S`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const ep = await getPublishedEpisode(slug);
    if (!ep) return { title: "Épisode" };
    const og = ogImageUrl({
      type: "episode",
      title: ep.title,
      subtitle: ep.themes?.[0],
      author: ep.authors?.[0],
    });
    return {
      title: ep.title,
      description: ep.description ?? undefined,
      openGraph: {
        type: "video.other",
        url: `${SITE_URL}/episodes/${slug}`,
        images: [{ url: og, width: 1200, height: 630, alt: ep.title }],
      },
      twitter: { card: "summary_large_image", images: [og] },
    };
  } catch {
    return { title: "Épisode" };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} min ${String(s).padStart(2, "0")}`;
}

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ep = await getPublishedEpisode(slug).catch(() => null);
  if (!ep) notFound();

  return (
    <article>
      {ep.youtube_id ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: ep.title,
            description: ep.description ?? undefined,
            thumbnailUrl: `https://i.ytimg.com/vi/${ep.youtube_id}/maxresdefault.jpg`,
            uploadDate: ep.published_at ?? ep.created_at,
            duration: isoDuration(ep.duration_sec),
            embedUrl: `https://www.youtube.com/embed/${ep.youtube_id}`,
            contentUrl: `https://www.youtube.com/watch?v=${ep.youtube_id}`,
            url: `${SITE_URL}/episodes/${ep.slug}`,
            inLanguage: "fr",
            publisher: {
              "@type": "Organization",
              name: "Soufi Studio",
              url: SITE_URL,
            },
          }}
        />
      ) : null}

      <nav className="mb-8 text-center text-xs uppercase tracking-widest text-navy-400">
        <Link href="/episodes" className="hover:text-gold-dark">
          ← Tous les épisodes
        </Link>
      </nav>

      <header className="mb-10 text-center">
        <p className="ornament">۞</p>
        <h1 className="mx-auto mt-4 max-w-4xl font-title text-5xl italic leading-tight text-navy-700">
          {ep.title}
        </h1>
        <p className="mt-3 text-xs uppercase tracking-widest text-gold-dark">
          {formatDate(ep.published_at)}
          {ep.duration_sec ? ` · ${formatDuration(ep.duration_sec)}` : ""}
        </p>
      </header>

      {ep.youtube_id ? (
        <div className="mx-auto mb-10 aspect-video w-full max-w-4xl overflow-hidden rounded-sm border border-gold/20 bg-black shadow-lg">
          <iframe
            src={`https://www.youtube.com/embed/${ep.youtube_id}`}
            title={ep.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : null}

      {ep.description ? (
        <section className="mx-auto max-w-3xl rounded-sm border border-gold/20 bg-white/40 p-8">
          <p className="whitespace-pre-line text-base leading-relaxed text-navy-600">
            {ep.description}
          </p>
        </section>
      ) : null}

      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap gap-2">
          {(ep.themes ?? []).map((t) => (
            <Link
              key={t}
              href={`/themes/${t}`}
              className="rounded-full border border-gold/20 px-3 py-1 text-xs italic text-gold-dark hover:border-gold hover:text-navy-700"
            >
              #{t}
            </Link>
          ))}
        </div>
        {ep.youtube_id ? (
          <a
            href={`https://www.youtube.com/watch?v=${ep.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-xs uppercase tracking-widest text-navy-500 hover:text-gold-dark"
          >
            Ouvrir sur YouTube ↗
          </a>
        ) : null}
      </div>
    </article>
  );
}
