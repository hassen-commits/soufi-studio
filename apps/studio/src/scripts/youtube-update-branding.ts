/**
 * Met à jour la description + les mots-clés de la chaîne YouTube
 * via youtube.channels.update (part=brandingSettings).
 *
 * Usage : tsx src/scripts/youtube-update-branding.ts
 *
 * Modifie UNIQUEMENT description et keywords. Le titre, la miniature,
 * la bannière et le reste sont inchangés.
 */
import { getAccessToken } from "../lib/youtube.js";

const API = "https://www.googleapis.com/youtube/v3";

const NEW_DESCRIPTION =
  "Passion_Coran — Partager les vérités divines de la lettre coranique et " +
  "la sagesse des grands maîtres soufis : Rûmî, Ibn ʿArabî, al-Ghazâlî, " +
  "al-Tustarî.\n\nCapsules audio et textes en français littéraire, dans la " +
  "tradition des grands traducteurs (Pierre Lory, Eva de Vitray-Meyerovitch).";

const NEW_KEYWORDS =
  'coran islam soufisme rûmî "ibn arabi" ghazali tustari spiritualité ' +
  'mystique "langue arabe" tradition islamique';

async function main() {
  const token = await getAccessToken();

  // 1. Récupérer l'ID + le pays courant (channels.update veut un brandingSettings complet)
  const meRes = await fetch(
    `${API}/channels?part=snippet,brandingSettings&mine=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!meRes.ok) {
    throw new Error(`channels.list mine: ${meRes.status} ${await meRes.text()}`);
  }
  const me = (await meRes.json()) as {
    items: Array<{
      id: string;
      brandingSettings?: { channel?: Record<string, unknown> };
    }>;
  };
  const channel = me.items[0];
  if (!channel) throw new Error("Aucun channel sur ce token");

  const currentChannelBranding =
    (channel.brandingSettings?.channel as Record<string, unknown>) ?? {};

  const updateBody = {
    id: channel.id,
    brandingSettings: {
      channel: {
        ...currentChannelBranding,
        description: NEW_DESCRIPTION,
        keywords: NEW_KEYWORDS,
      },
    },
  };

  console.log("=== PAYLOAD channels.update ===");
  console.log(JSON.stringify(updateBody, null, 2));
  console.log("");

  const updateRes = await fetch(
    `${API}/channels?part=brandingSettings`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateBody),
    },
  );

  if (!updateRes.ok) {
    const body = await updateRes.text();
    throw new Error(`channels.update ${updateRes.status}: ${body.slice(0, 600)}`);
  }

  const updated = (await updateRes.json()) as {
    id: string;
    brandingSettings?: { channel?: { description?: string; keywords?: string } };
  };

  console.log("=== APRÈS UPDATE ===");
  console.log("Channel ID :", updated.id);
  console.log("Description:", updated.brandingSettings?.channel?.description);
  console.log("Keywords   :", updated.brandingSettings?.channel?.keywords);
  console.log("\n✅ Branding mis à jour.");
}

main().catch((e) => {
  console.error("Erreur :", e instanceof Error ? e.message : e);
  process.exit(1);
});
