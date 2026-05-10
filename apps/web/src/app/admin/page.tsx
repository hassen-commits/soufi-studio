import Link from "next/link";
import {
  adminCountEpisodesByStatus,
  adminListEpisodes,
  type EpisodeStatus,
} from "@soufi/db";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<EpisodeStatus, string> = {
  planned: "Planifié",
  script_ready: "Script prêt",
  audio_ready: "Audio prêt",
  video_ready: "Vidéo prête",
  published: "Publié",
  failed: "Échec",
};

const STATUS_COLOR: Record<EpisodeStatus, string> = {
  planned: "bg-navy-100 text-navy-700",
  script_ready: "bg-blue-100 text-blue-700",
  audio_ready: "bg-purple-100 text-purple-700",
  video_ready: "bg-amber-100 text-amber-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default async function AdminOverview() {
  let counts: Record<EpisodeStatus, number> = {
    planned: 0,
    script_ready: 0,
    audio_ready: 0,
    video_ready: 0,
    published: 0,
    failed: 0,
  };
  let recent: Awaited<ReturnType<typeof adminListEpisodes>> = [];
  let error: string | null = null;

  try {
    [counts, recent] = await Promise.all([
      adminCountEpisodesByStatus(),
      adminListEpisodes({ limit: 8 }),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="font-title text-4xl italic text-navy-700">Vue d'ensemble</h1>
        <p className="mt-2 text-sm text-navy-500">
          {total} épisode{total > 1 ? "s" : ""} dans la pipeline · service_role Supabase
        </p>
      </header>

      {error ? (
        <div className="rounded-sm border border-red-300 bg-red-50 p-6 text-sm text-red-800">
          <strong>Erreur :</strong> {error}
          <p className="mt-2 text-xs">
            Vérifie que <code>SUPABASE_SERVICE_KEY</code> est défini dans <code>.env</code>{" "}
            et que la table <code>episodes</code> existe (voir <code>supabase/setup.sql</code>).
          </p>
        </div>
      ) : null}

      <section>
        <h2 className="mb-4 font-title text-xl italic text-navy-700">Statuts</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(STATUS_LABEL) as EpisodeStatus[]).map((status) => (
            <Link
              key={status}
              href={`/admin/episodes?status=${status}`}
              className="rounded-sm border border-gold/20 p-5 transition hover:border-gold hover:bg-parchment/40"
            >
              <div className="font-title text-3xl text-navy-700">{counts[status]}</div>
              <div
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[status]}`}
              >
                {STATUS_LABEL[status]}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-title text-xl italic text-navy-700">Épisodes récents</h2>
          <Link
            href="/admin/episodes"
            className="text-xs uppercase tracking-widest text-gold-dark hover:text-navy-700"
          >
            Tout voir →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-navy-500">
            Aucun épisode encore. Crée-en via <code>/podcast</code> du studio backend ou
            insère manuellement dans la table <code>episodes</code>.
          </p>
        ) : (
          <ul className="divide-y divide-gold/10 rounded-sm border border-gold/20">
            {recent.map((ep) => (
              <li key={ep.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-title text-lg italic text-navy-700">{ep.title}</div>
                  <div className="mt-1 text-xs text-navy-400">
                    {new Date(ep.created_at).toLocaleDateString("fr-FR")} ·{" "}
                    {ep.mode}
                    {ep.youtube_id ? (
                      <>
                        {" "}·{" "}
                        <a
                          href={`https://youtu.be/${ep.youtube_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gold-dark hover:underline"
                        >
                          YouTube ↗
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${STATUS_COLOR[ep.status]}`}
                >
                  {STATUS_LABEL[ep.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-gold/20 bg-parchment/40 p-6">
        <h2 className="font-title text-xl italic text-navy-700">Déclencher un job</h2>
        <p className="mt-2 text-xs text-navy-500">
          Les jobs cron tournent automatiquement quand <code>CRON_ENABLED=true</code>{" "}
          dans <code>.env</code>. Pour les déclencher manuellement (depuis ce poste) :
        </p>
        <pre className="mt-4 overflow-x-auto rounded-sm bg-navy-700 p-4 text-xs text-parchment">
{`# Production hebdo (génère le prochain épisode 'planned')
curl -X POST http://localhost:3001/admin/run/weekly-production \\
  -H "Authorization: Bearer $ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{}'

# Publication quotidienne (publie le prochain 'video_ready')
curl -X POST http://localhost:3001/admin/run/daily-publisher \\
  -H "Authorization: Bearer $ADMIN_TOKEN"`}
        </pre>
      </section>
    </div>
  );
}
