/**
 * Composant utilitaire pour insérer un bloc Schema.org JSON-LD dans une page.
 * À utiliser dans le rendu serveur d'une page :
 *
 *   <JsonLd data={{
 *     "@context": "https://schema.org",
 *     "@type": "Quotation",
 *     ...
 *   }} />
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Next/React échappe correctement les caractères dangereux dans innerHTML
      // tant qu'on passe un objet sérialisable (pas de fonctions, pas de undefined cyclique).
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
