/**
 * Passe une ou plusieurs vidéos YouTube en `public` via videos.update?part=status.
 * Usage : tsx src/scripts/youtube-set-public.ts <videoId> [<videoId> ...]
 */
import { getAccessToken } from "../lib/youtube.js";

const API = "https://www.googleapis.com/youtube/v3";

async function setPublic(videoId: string, token: string) {
  // 1. Récupérer le snippet actuel (categoryId requis pour update part=status)
  const meta = await fetch(
    `${API}/videos?part=status,snippet&id=${videoId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!meta.ok) {
    throw new Error(`videos.list ${meta.status}: ${await meta.text()}`);
  }
  const metaJson = (await meta.json()) as {
    items: Array<{
      id: string;
      snippet: { title: string };
      status: { privacyStatus: string };
    }>;
  };
  const cur = metaJson.items[0];
  if (!cur) throw new Error(`Video ${videoId} introuvable (ou pas à toi)`);

  console.log(`[${videoId}] avant : ${cur.status.privacyStatus} — ${cur.snippet.title}`);
  if (cur.status.privacyStatus === "public") {
    console.log("  (déjà public, skip)");
    return;
  }

  // 2. Update — l'API videos.update veut un body complet pour les `part`
  // listés. On passe seulement part=status pour ne toucher que la confidentialité.
  const res = await fetch(`${API}/videos?part=status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: videoId,
      status: { privacyStatus: "public" },
    }),
  });

  if (!res.ok) {
    throw new Error(`videos.update ${res.status}: ${await res.text()}`);
  }

  const after = (await res.json()) as {
    id: string;
    status: { privacyStatus: string };
  };
  console.log(`[${videoId}] après : ${after.status.privacyStatus} ✅`);
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("Usage : tsx youtube-set-public.ts <videoId> [<videoId> ...]");
    process.exit(1);
  }
  const token = await getAccessToken();
  for (const id of ids) {
    try {
      await setPublic(id, token);
    } catch (e) {
      console.error(`[${id}] ERREUR :`, e instanceof Error ? e.message : e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
