import { NextResponse } from "next/server";
import { getSupabase } from "@soufi/db";

export const revalidate = 600;
export const dynamic = "force-dynamic";

interface EpisodeRow {
  slug: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  duration_sec: number | null;
  published_at: string | null;
  created_at: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.iavance.fr";
const CHANNEL = {
  title: "Soufi Studio · Passion_Coran",
  description:
    "Le souffle des grands maîtres soufis, transmis en français. Podcast spirituel " +
    "puisant dans Rûmî, Ibn ʿArabî, al-Ghazâlî, al-Tustarî et la tradition entière du soufisme.",
  language: "fr-FR",
  author: "Hassen — IAVANCE",
  email: "elfourhassen@gmail.com",
  imageUrl: `${SITE_URL}/og/podcast-cover.png`,
  category: "Religion & Spirituality",
  subcategory: "Spirituality",
  explicit: false,
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc2822(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toUTCString();
}

function durationHHMMSS(sec: number | null): string {
  const s = sec ?? 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    ss,
  ).padStart(2, "0")}`;
}

export async function GET() {
  let episodes: EpisodeRow[] = [];

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("episodes")
      .select("slug, title, description, audio_url, duration_sec, published_at, created_at")
      .eq("status", "published")
      .not("audio_url", "is", null)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(200);
    episodes = (data ?? []) as EpisodeRow[];
  } catch {
    // pas de connexion Supabase → flux vide mais valide
  }

  const itemsXml = episodes
    .map((ep) => {
      const url = `${SITE_URL}/episodes/${ep.slug}`;
      const audioUrl = ep.audio_url ?? "";
      const audioPath = audioUrl.startsWith("http") ? audioUrl : `${SITE_URL}${audioUrl}`;
      const pubDate = rfc2822(ep.published_at ?? ep.created_at);
      return `    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(ep.description ?? "")}</description>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="false">soufi-studio-${ep.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${escapeXml(audioPath)}" length="0" type="audio/mpeg" />
      <itunes:duration>${durationHHMMSS(ep.duration_sec)}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:author>${escapeXml(CHANNEL.author)}</itunes:author>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CHANNEL.title)}</title>
    <description>${escapeXml(CHANNEL.description)}</description>
    <link>${SITE_URL}</link>
    <language>${CHANNEL.language}</language>
    <copyright>© ${new Date().getFullYear()} ${escapeXml(CHANNEL.author)}</copyright>
    <atom:link href="${SITE_URL}/podcast/rss.xml" rel="self" type="application/rss+xml" />
    <itunes:author>${escapeXml(CHANNEL.author)}</itunes:author>
    <itunes:summary>${escapeXml(CHANNEL.description)}</itunes:summary>
    <itunes:owner>
      <itunes:name>${escapeXml(CHANNEL.author)}</itunes:name>
      <itunes:email>${CHANNEL.email}</itunes:email>
    </itunes:owner>
    <itunes:image href="${CHANNEL.imageUrl}" />
    <itunes:category text="${CHANNEL.category}">
      <itunes:category text="${CHANNEL.subcategory}" />
    </itunes:category>
    <itunes:explicit>${CHANNEL.explicit ? "true" : "false"}</itunes:explicit>
    <itunes:type>episodic</itunes:type>
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, stale-while-revalidate=3600",
    },
  });
}
