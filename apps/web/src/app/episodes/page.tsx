import Link from "next/link";
import { listPublishedEpisodes } from "@soufi/db";

export const revalidate = 600;
export const metadata = { title: "Épisodes" };

function formatDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function EpisodesPage() {
  let episodes: Awaited<ReturnType<typeof listPublishedEpisodes>> = [];
  let error: string | null = null;
  try {
    episodes = await listPublishedEpisodes({ limit: 50 });
  } catch (e) {
    error = e instanceof Error ? e.message : "Erreur de connexion";
  }

  return (
    <div>
      <header className="mb-12 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-4 font-title text-5xl italic text-navy-700">Épisodes</h1>
        <p className="mx-auto mt-3 max-w-prose text-sm text-navy-500">
          Capsules audio et vidéos méditatives — la sagesse des grands maîtres
          en français littéraire, sur YouTube et bientôt sur Spotify / Apple Podcasts.
        </p>
      </header>

      {error ? (
        <div className="mx-auto max-w-prose rounded-sm border border-gold/20 bg-white/40 p-10 text-center">
          <p className="font-title text-xl italic text-navy-600">{error}</p>
        </div>
      ) : episodes.length === 0 ? (
        <div className="mx-auto max-w-prose py-12 text-center">
          <p className="text-navy-500">Le premier épisode arrive bientôt.</p>
          <div className="gold-divider" />
          <p className="font-title text-lg italic text-gold-light">
            « Patience est la clé du soulagement. »
          </p>
          <p className="mt-1 text-xs uppercase tracking-widest text-navy-400">
            — Tradition soufie
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {episodes.map((ep) => (
            <article
              key={ep.id}
              className="rounded-sm border border-gold/20 bg-white/60 p-8 transition hover:border-gold/40 hover:bg-white"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-title text-3xl italic text-navy-700">
                  {ep.title}
                </h2>
                <div className="text-xs uppercase tracking-widest text-gold-dark">
                  {formatDate(ep.published_at)}
                  {ep.duration_sec ? ` · ${formatDuration(ep.duration_sec)}` : ""}
                </div>
              </div>

              {ep.description ? (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-navy-600">
                  {ep.description}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                {ep.youtube_id ? (
                  <a
                    href={`https://www.youtube.com/watch?v=${ep.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-gold bg-gold/10 px-4 py-1.5 font-body text-xs uppercase tracking-widest text-navy-700 transition hover:bg-gold hover:text-navy-900"
                  >
                    ▶ Regarder sur YouTube
                  </a>
                ) : null}
                <Link
                  href={`/episodes/${ep.slug}`}
                  className="font-body text-xs uppercase tracking-widest text-navy-500 hover:text-gold-dark"
                >
                  Détails →
                </Link>
              </div>

              {ep.themes && ep.themes.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-gold/10 pt-4">
                  {ep.themes.map((t) => (
                    <Link
                      key={t}
                      href={`/themes/${t}`}
                      className="rounded-full border border-gold/20 px-3 py-1 text-xs italic text-gold-dark hover:border-gold hover:text-navy-700"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
