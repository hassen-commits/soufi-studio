import { stat, readFile } from "node:fs/promises";
import { env } from "../env.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: AccessTokenCache | null = null;

/**
 * Échange le refresh_token contre un access_token (cache 50 min).
 */
export async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  if (!env.YOUTUBE_CLIENT_ID || !env.YOUTUBE_CLIENT_SECRET || !env.YOUTUBE_REFRESH_TOKEN) {
    throw new Error(
      "YouTube non configuré : YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET et " +
        "YOUTUBE_REFRESH_TOKEN doivent être définis dans .env",
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      refresh_token: env.YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OAuth refresh failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 600) * 1000,
  };
  return data.access_token;
}

export type PrivacyStatus = "public" | "unlisted" | "private";

export interface UploadInput {
  filePath: string;
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: PrivacyStatus;
  madeForKids?: boolean;
  defaultLanguage?: string;
}

export interface UploadResult {
  videoId: string;
  url: string;
  uploadedBytes: number;
}

/**
 * Upload résumable d'un MP4 vers YouTube.
 * Catégorie par défaut : 22 (People & Blogs). Autres utiles : 27 (Education).
 */
export async function uploadVideo(input: UploadInput): Promise<UploadResult> {
  const accessToken = await getAccessToken();
  const fileStat = await stat(input.filePath);

  // Étape 1 : ouvrir une session d'upload résumable
  const initRes = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(fileStat.size),
    },
    body: JSON.stringify({
      snippet: {
        title: input.title.slice(0, 100),
        description: input.description.slice(0, 5000),
        tags: input.tags?.slice(0, 30),
        categoryId: input.categoryId ?? "22",
        defaultLanguage: input.defaultLanguage ?? "fr",
      },
      status: {
        privacyStatus: input.privacyStatus ?? "private",
        madeForKids: input.madeForKids ?? false,
        selfDeclaredMadeForKids: input.madeForKids ?? false,
      },
    }),
  });

  if (!initRes.ok) {
    const body = await initRes.text();
    throw new Error(`YouTube init upload (${initRes.status}): ${body.slice(0, 300)}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return upload URL");

  // Étape 2 : upload des bytes
  const fileBuf = await readFile(input.filePath);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fileStat.size),
    },
    body: fileBuf,
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`YouTube upload bytes (${uploadRes.status}): ${body.slice(0, 300)}`);
  }

  const data = (await uploadRes.json()) as { id: string };
  return {
    videoId: data.id,
    url: `https://www.youtube.com/watch?v=${data.id}`,
    uploadedBytes: fileStat.size,
  };
}
