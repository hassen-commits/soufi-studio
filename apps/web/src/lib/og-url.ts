const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.iavance.fr";

export interface OgParams {
  type?: "default" | "citation" | "episode" | "theme" | "maitre";
  title: string;
  subtitle?: string;
  author?: string;
  work?: string;
}

/**
 * Construit l'URL absolue de l'image OG dynamique servie par `/og`.
 * À placer dans `metadata.openGraph.images` et `metadata.twitter.images`.
 */
export function ogImageUrl(params: OgParams): string {
  const sp = new URLSearchParams();
  sp.set("type", params.type ?? "default");
  sp.set("title", truncate(params.title, 140));
  if (params.subtitle) sp.set("subtitle", truncate(params.subtitle, 80));
  if (params.author) sp.set("author", truncate(params.author, 60));
  if (params.work) sp.set("work", truncate(params.work, 60));
  return `${SITE_URL}/og?${sp.toString()}`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
