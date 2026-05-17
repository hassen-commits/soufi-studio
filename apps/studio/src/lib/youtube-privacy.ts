import { getAccessToken } from "./youtube.js";

const API = "https://www.googleapis.com/youtube/v3";

export type PrivacyStatus = "public" | "unlisted" | "private";

/**
 * Bascule la confidentialité d'une vidéo YouTube via videos.update?part=status.
 * Nécessite le scope `https://www.googleapis.com/auth/youtube` (PAS juste youtube.upload).
 */
export async function setVideoPrivacy(
  videoId: string,
  privacy: PrivacyStatus,
): Promise<{ id: string; privacyStatus: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${API}/videos?part=status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: videoId,
      status: { privacyStatus: privacy },
    }),
  });
  if (!res.ok) {
    throw new Error(`videos.update ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string; status: { privacyStatus: string } };
  return { id: data.id, privacyStatus: data.status.privacyStatus };
}
