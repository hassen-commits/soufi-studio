import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos et méthode éditoriale",
  description: "Découvrez la mission, les sources et la méthode éditoriale de Soufi Studio.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl py-12">
      <header className="text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-5 font-title text-5xl italic text-navy-700">À propos et méthode</h1>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-navy-500">
          Soufi Studio transmet en français des textes issus des grandes œuvres de la tradition soufie, avec le souci de préserver leur contexte et leur attribution.
        </p>
      </header>
      <div className="mt-14 space-y-10 leading-relaxed text-navy-600">
        <section>
          <h2 className="font-title text-3xl italic">Notre démarche</h2>
          <p className="mt-3">Le corpus est constitué à partir d’ouvrages numérisés et de traductions françaises. L’extraction automatisée facilite l’exploration de milliers de passages, mais peut introduire des erreurs typographiques ou des coupures. Les contenus mis en avant font l’objet de contrôles supplémentaires.</p>
        </section>
        <section>
          <h2 className="font-title text-3xl italic">Lire les références</h2>
          <p className="mt-3">Lorsqu’elles sont disponibles, l’œuvre, la traduction et la localisation du passage accompagnent l’extrait. Ces indications permettent de revenir au livre source, qui demeure la référence.</p>
        </section>
        <section>
          <h2 className="font-title text-3xl italic">Corrections</h2>
          <p className="mt-3">Le corpus évolue continuellement. Une transcription ne remplace pas une édition critique. Toute erreur signalée peut être vérifiée puis corrigée à partir du document source.</p>
        </section>
      </div>
    </article>
  );
}
