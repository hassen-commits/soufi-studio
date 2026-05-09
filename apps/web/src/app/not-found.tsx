import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="ornament">۞</p>
      <h1 className="mt-6 font-title text-5xl italic text-navy-700">Page introuvable</h1>
      <p className="mt-4 font-title text-lg italic text-gold-light">
        « Quiconque cherche trouvera. »
      </p>
      <Link
        href="/"
        className="mt-10 inline-block text-sm uppercase tracking-widest text-gold-dark hover:text-navy-700"
      >
        ← Retour à l'accueil
      </Link>
    </div>
  );
}
