import Link from "next/link";
import { revalidatePath } from "next/cache";
import { adminListEpisodes, type EpisodeStatus } from "@soufi/db";
import {
  studioDeleteEpisode,
  studioProduceEpisode,
  studioPublishYoutube,
  studioSetPrivacy,
} from "@/lib/studio-api";

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

async function produceAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  // Fire-and-forget : la prod prend 15-20 min, on n'attend pas la fin
  studioProduceEpisode(id).catch(() => undefined);
  revalidatePath("/admin/episodes");
}

async function setPrivacyAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const privacy = String(formData.get("privacy")) as
    | "public"
    | "unlisted"
    | "private";
  await studioSetPrivacy(id, privacy);
  revalidatePath("/admin/episodes");
  revalidatePath("/episodes");
}

async function publishAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  // L'upload YouTube prend ~30-60s, on attend la fin avant revalidation
  await studioPublishYoutube(id);
  revalidatePath("/admin/episodes");
}

async function deleteAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await studioDeleteEpisode(id);
  revalidatePath("/admin/episodes");
  revalidatePath("/episodes");
}

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
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-title text-4xl italic text-navy-700">Épisodes</h1>
          <p className="mt-2 text-sm text-navy-500">
            {episodes.length} résultat{episodes.length > 1 ? "s" : ""}
            {statusFilter ? ` · filtré sur "${STATUS_LABEL[statusFilter]}"` : ""}
          </p>
        </div>
        <Link
          href="/admin/produce"
          className="rounded-sm bg-navy-700 px-4 py-2 text-xs uppercase tracking-widest text-parchment transition hover:bg-navy-500"
        >
          + Nouvel épisode
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/episodes" className={filterClass(!statusFilter)}>
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gold/30 text-left text-xs uppercase tracking-widest text-navy-500">
                <th className="py-3 pr-4">Titre</th>
                <th className="py-3 pr-4">Auteur</th>
                <th className="py-3 pr-4">Statut</th>
                <th className="py-3 pr-4">Créé</th>
                <th className="py-3 pr-4">YouTube</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((ep) => (
                <tr key={ep.id} className="border-b border-gold/10 hover:bg-parchment/30">
                  <td className="py-3 pr-4">
                    <div className="font-title text-base italic text-navy-700">
                      {ep.title}
                    </div>
                    <div className="text-xs text-navy-400">{ep.slug}</div>
                  </td>
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
                  <td className="py-3 pr-4 text-xs">
                    {ep.youtube_id ? (
                      <a
                        href={`https://youtu.be/${ep.youtube_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold-dark hover:underline"
                      >
                        {ep.youtube_id} ↗
                      </a>
                    ) : (
                      <span className="text-navy-300">—</span>
                    )}
                  </td>
                  <td className="py-3 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {ep.status === "planned" || ep.status === "failed" ? (
                        <form action={produceAction}>
                          <input type="hidden" name="id" value={ep.id} />
                          <button
                            type="submit"
                            className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                            title="Lance le script + audio + render (~15-20 min)"
                          >
                            ▶ Produire
                          </button>
                        </form>
                      ) : null}

                      {ep.status === "video_ready" && !ep.youtube_id ? (
                        <form action={publishAction}>
                          <input type="hidden" name="id" value={ep.id} />
                          <button
                            type="submit"
                            className="rounded border border-purple-300 bg-purple-50 px-2 py-1 text-xs text-purple-700 hover:bg-purple-100"
                            title="Upload du LONG sur YouTube (unlisted, ~30-60s)"
                          >
                            📤 Publier
                          </button>
                        </form>
                      ) : null}

                      {ep.youtube_id ? (
                        <>
                          {ep.status !== "published" ? (
                            <form action={setPrivacyAction}>
                              <input type="hidden" name="id" value={ep.id} />
                              <input type="hidden" name="privacy" value="public" />
                              <button
                                type="submit"
                                className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                                title="Bascule la vidéo YouTube en public et publie sur le site"
                              >
                                🌐 Public
                              </button>
                            </form>
                          ) : (
                            <form action={setPrivacyAction}>
                              <input type="hidden" name="id" value={ep.id} />
                              <input type="hidden" name="privacy" value="unlisted" />
                              <button
                                type="submit"
                                className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
                                title="Repasser la vidéo en non répertoriée"
                              >
                                🔒 Unlisted
                              </button>
                            </form>
                          )}
                        </>
                      ) : null}

                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={ep.id} />
                        <button
                          type="submit"
                          className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                          title="Supprimer la ligne en DB (la vidéo YouTube reste, à supprimer manuellement)"
                        >
                          🗑️
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
