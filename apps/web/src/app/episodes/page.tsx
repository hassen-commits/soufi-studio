export const metadata = { title: "Épisodes" };

export default function EpisodesPage() {
  return (
    <div className="py-12 text-center">
      <p className="ornament">۞</p>
      <h1 className="mt-4 font-title text-5xl italic text-navy-700">Épisodes</h1>
      <p className="mx-auto mt-6 max-w-prose text-navy-500">
        Le studio prépare ses premiers épisodes de podcast et capsules vidéo.
        Cette page accueillera bientôt la programmation hebdomadaire — long format
        sur YouTube, audio sur Spotify et Apple, et capsules courtes pour TikTok et Reels.
      </p>
      <div className="gold-divider" />
      <p className="font-title text-lg italic text-gold-light">
        « Patience est la clé du soulagement. »
      </p>
      <p className="mt-1 text-xs uppercase tracking-widest text-navy-400">— Tradition soufie</p>
    </div>
  );
}
