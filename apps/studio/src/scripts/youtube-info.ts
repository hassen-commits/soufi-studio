import { getAccessToken } from "../lib/youtube.js";

const API = "https://www.googleapis.com/youtube/v3";

async function main() {
  const token = await getAccessToken();

  const channelRes = await fetch(
    `${API}/channels?part=snippet,statistics,brandingSettings&mine=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!channelRes.ok) {
    const body = await channelRes.text();
    throw new Error(`channels.list (${channelRes.status}): ${body.slice(0, 400)}`);
  }

  const data = (await channelRes.json()) as {
    items: Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        customUrl?: string;
        country?: string;
        publishedAt: string;
        thumbnails: { default: { url: string } };
      };
      statistics: {
        viewCount: string;
        subscriberCount: string;
        hiddenSubscriberCount?: boolean;
        videoCount: string;
      };
      brandingSettings?: {
        channel?: { keywords?: string };
      };
    }>;
  };

  for (const ch of data.items) {
    console.log("---");
    console.log("ID                :", ch.id);
    console.log("Titre             :", ch.snippet.title);
    console.log("Handle / URL      :", ch.snippet.customUrl ?? "(non défini)");
    console.log("Pays              :", ch.snippet.country ?? "(non défini)");
    console.log("Créée le          :", ch.snippet.publishedAt);
    console.log("Abonnés           :", ch.statistics.subscriberCount);
    console.log("Vues totales      :", ch.statistics.viewCount);
    console.log("Vidéos publiées   :", ch.statistics.videoCount);
    console.log("Mots-clés         :", ch.brandingSettings?.channel?.keywords ?? "(aucun)");
    console.log("Miniature         :", ch.snippet.thumbnails.default.url);
    console.log("");
    console.log("Description       :");
    console.log(ch.snippet.description.split("\n").map((l) => "  " + l).join("\n"));
  }
}

main().catch((e) => {
  console.error("Erreur :", e instanceof Error ? e.message : e);
  process.exit(1);
});
