import type { MetadataRoute } from "next";
import { MAITRES } from "@soufi/content";
import { listCitations, listPublishedEpisodes } from "@soufi/db";
import { THEMES } from "@/lib/themes";

export const revalidate = 86400; // 1 jour

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.iavance.fr";
const CITATIONS_IN_SITEMAP = 500; // les 500 premières dans le sitemap principal

function url(path: string): string {
  return `${SITE_URL}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: url("/bibliotheque"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: url("/maitres"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/themes"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/episodes"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  // Maîtres
  const maitresPages: MetadataRoute.Sitemap = MAITRES.map((m) => ({
    url: url(`/maitres/${m.key}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Thèmes
  const themesPages: MetadataRoute.Sitemap = THEMES.map((t) => ({
    url: url(`/themes/${t.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Épisodes publiés
  let episodesPages: MetadataRoute.Sitemap = [];
  try {
    const episodes = await listPublishedEpisodes({ limit: 200 });
    episodesPages = episodes.map((ep) => ({
      url: url(`/episodes/${ep.slug}`),
      lastModified: ep.published_at ? new Date(ep.published_at) : now,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    }));
  } catch {
    // ignore : le sitemap reste utilisable
  }

  // Citations (top N pour ne pas exploser la taille)
  let citationsPages: MetadataRoute.Sitemap = [];
  try {
    const citations = await listCitations({ limit: CITATIONS_IN_SITEMAP });
    citationsPages = citations.map((c) => ({
      url: url(`/citations/${c.author}/${c.slug}`),
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    }));
  } catch {
    // ignore
  }

  return [...staticPages, ...maitresPages, ...themesPages, ...episodesPages, ...citationsPages];
}
