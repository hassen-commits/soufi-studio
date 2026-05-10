import { resolve } from "node:path";
import { logger } from "../../lib/logger.js";
import { uploadVideo, type PrivacyStatus } from "../../lib/youtube.js";

export interface PublishYouTubeInput {
  video_path: string;
  title: string;
  description: string;
  tags?: string[];
  privacy?: PrivacyStatus;
  is_short?: boolean;
}

export interface PublishYouTubeOutput {
  videoId: string;
  url: string;
  uploadedBytes: number;
  privacy: PrivacyStatus;
}

const MEDIA_DIR = resolve(process.cwd(), "media");

function resolveVideoPath(p: string): string {
  // Supporte URLs servies par Hono (/media/xxx.mp4) et chemins absolus
  if (p.startsWith("/media/")) {
    return resolve(MEDIA_DIR, p.slice("/media/".length));
  }
  if (p.startsWith("http://") || p.startsWith("https://")) {
    throw new Error(
      "video_path doit être un chemin local ou /media/xxx.mp4. " +
        "Téléchargement HTTP non supporté pour cette tool.",
    );
  }
  return resolve(p);
}

export async function publishYoutube(
  input: PublishYouTubeInput,
): Promise<PublishYouTubeOutput> {
  const filePath = resolveVideoPath(input.video_path);

  // Pour un Short : forcer #Shorts dans le titre/description si pas déjà
  let title = input.title;
  let description = input.description;
  if (input.is_short) {
    if (!title.includes("#Shorts")) title = `${title} #Shorts`;
    if (!description.toLowerCase().includes("#shorts")) {
      description = `${description}\n\n#Shorts`;
    }
  }

  logger.info(
    {
      filePath,
      title: title.slice(0, 60),
      privacy: input.privacy ?? "private",
      isShort: input.is_short,
    },
    "publish_youtube start",
  );

  const result = await uploadVideo({
    filePath,
    title,
    description,
    tags: input.tags ?? [
      "soufisme",
      "spiritualité",
      "rûmî",
      "ibn arabi",
      "ghazali",
      "tradition islamique",
    ],
    privacyStatus: input.privacy ?? "private",
    categoryId: "22",
    defaultLanguage: "fr",
  });

  logger.info({ videoId: result.videoId, url: result.url }, "publish_youtube done");

  return {
    videoId: result.videoId,
    url: result.url,
    uploadedBytes: result.uploadedBytes,
    privacy: input.privacy ?? "private",
  };
}
