import Link from "next/link";
import { adminListEpisodes, type EpisodeStatus } from "@soufi/db";

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

const ALL_STATUSES = Object.keys(STATUS_LABEL) as EpisodeStatus[];

export default async function AdminEpisodes({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status as EpisodeStatus | undefined;

  let episodes: Awaited<ReturnType<typeof adminListEpisodes>> = [];
  let error: string | null = null;

  try {
    episodes = await adminListEpisodes({
      status: statusFilter,
      limit: 200,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-title text-4xl italic text-navy-700">Épisodes</h1>
        <p className="mt-2 text-sm text-navy-500">
          {episodes.length} résultat{episodes.length > 1 ? "s" : ""}
          {statusFilter ? ` · filtré sur "${STATUS_LABEL[statusFilter]}"` : ""}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/episodes"
          className={filterClass(!statusFilter)}
        >
          Tous
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/episodes?status=${s}`}
            className={filterClass(statusFilter === s)}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      {error ? (
        <div className="rounded-sm border border-red-300 bg-red-50 p-6 text-sm text-red-800">
          {error}
        </div>
      ) : episodes.length === 0 ? (
        <p className="rounded-sm border border-gold/20 p-10 text-center text-sm text-navy-500">
          Aucun épisode pour ce filtre.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-left text-xs uppercase tracking-widest text-navy-500">
              <th className="py-3 pr-4">Titre</th>
              <th className="py-3 pr-4">Mode</th>
              <th className="py-3 pr-4">Auteur(s)</th>
              <th className="py-3 pr-4">Statut</th>
              <th className="py-3 pr-4">Créé</th>
              <th className="py-3 pr-4">Publié</th>
              <th className="py-3">Liens</th>
            </tr>
          </thead>
          <tbody>
            {episodes.map((ep) => (
              <tr key={ep.id} className="border-b border-gold/10 hover:bg-parchment/30">
                <td className="py-3 pr-4">
                  <div className="font-title text-base italic text-navy-700">{ep.title}</div>
                  <div className="text-xs text-navy-400">{ep.slug}</div>
                </td>
                <td className="py-3 pr-4 text-xs text-navy-500">{ep.mode}</td>
                <td className="py-3 pr-4 text-xs text-navy-500">
                  {(ep.authors ?? []).join(", ") || "—"}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[ep.status]}`}
                  >
                    {STATUS_LABEL[ep.status]}
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs text-navy-400">
                  {new Date(ep.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="py-3 pr-4 text-xs text-navy-400">
                  {ep.published_at
                    ? new Date(ep.published_at).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td className="py-3 text-xs">
                  <div className="flex gap-3">
                    {ep.audio_url ? (
                      <a
                        href={ep.audio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold-dark hover:underline"
                      >
                        Audio
                      </a>
                    ) : null}
                    {ep.video_long_url ? (
                      <a
                        href={ep.video_long_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold-dark hover:underline"
                      >
                        Vidéo
                      </a>
                    ) : null}
                    {ep.youtube_id ? (
                      <a
                        href={`https://youtu.be/${ep.youtube_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold-dark hover:underline"
                      >
                        YouTube ↗
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function filterClass(active: boolean): string {
  const base =
    "rounded-full border px-3 py-1 font-body text-xs uppercase tracking-widest transition";
  return active
    ? `${base} border-gold bg-gold text-navy-700`
    : `${base} border-gold/30 text-navy-500 hover:border-gold hover:text-navy-700`;
}
