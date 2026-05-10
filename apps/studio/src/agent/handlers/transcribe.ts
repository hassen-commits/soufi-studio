import { resolve } from "node:path";
import { transcribeAudio, type WhisperWord } from "../../lib/whisper.js";
import { logger } from "../../lib/logger.js";

const MEDIA_DIR = resolve(process.cwd(), "media");

export interface TranscribeInput {
  audio_path: string;
  group_size?: number;
}

export interface TranscribeOutput {
  text: string;
  duration_sec: number;
  words: WhisperWord[];
  groups: { start: number; end: number; text: string }[];
}

function resolvePath(p: string): string {
  if (p.startsWith("/media/")) {
    return resolve(MEDIA_DIR, p.slice("/media/".length));
  }
  return resolve(p);
}

/**
 * Regroupe les mots par paquets de N (typique pour sous-titres TikTok : 2-4 mots)
 * pour éviter le clignotement excessif et améliorer la lisibilité.
 */
function groupWords(words: WhisperWord[], size: number) {
  const groups: { start: number; end: number; text: string }[] = [];
  for (let i = 0; i < words.length; i += size) {
    const chunk = words.slice(i, i + size);
    if (chunk.length === 0) continue;
    groups.push({
      start: chunk[0]!.start,
      end: chunk[chunk.length - 1]!.end,
      text: chunk.map((w) => w.word).join(" ").trim(),
    });
  }
  return groups;
}

export async function transcribe(input: TranscribeInput): Promise<TranscribeOutput> {
  const filePath = resolvePath(input.audio_path);
  const groupSize = Math.min(Math.max(input.group_size ?? 3, 1), 8);

  logger.info({ filePath, groupSize }, "transcribe_audio");

  const result = await transcribeAudio(filePath);

  return {
    text: result.text,
    duration_sec: result.duration,
    words: result.words,
    groups: groupWords(result.words, groupSize),
  };
}
