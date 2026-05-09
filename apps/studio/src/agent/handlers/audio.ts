import { synthesize, audioOutPath } from "../../lib/elevenlabs.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../env.js";

export interface GenerateAudioInput {
  text: string;
  slug: string;
  voice_id?: string;
}

export interface GenerateAudioOutput {
  audio_path: string;
  url: string;
  bytes: number;
}

export async function generateAudio(
  input: GenerateAudioInput,
): Promise<GenerateAudioOutput> {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error(
      "ELEVENLABS_API_KEY non configuré — l'audio ne peut pas être généré.",
    );
  }
  const out = audioOutPath(input.slug);
  logger.info({ slug: input.slug, len: input.text.length, out }, "generate_audio");

  const result = await synthesize({
    text: input.text,
    outputPath: out,
    voiceId: input.voice_id,
  });

  const filename = out.split(/[\\/]/).pop();
  return { audio_path: result.path, url: `/media/${filename}`, bytes: result.bytes };
}
