import { createReadStream } from "node:fs";
import OpenAI from "openai";
import { env } from "../env.js";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface WhisperResult {
  text: string;
  language: string;
  duration: number;
  words: WhisperWord[];
  segments?: WhisperSegment[];
}

/**
 * Transcrit un fichier audio (mp3, m4a, wav…) avec Whisper-1.
 * Retourne le texte plein + les mots avec timestamps précis (granularité = word).
 * Coût indicatif : 0,006 $ / minute.
 */
export async function transcribeAudio(filePath: string): Promise<WhisperResult> {
  const stream = createReadStream(filePath);

  const response = (await client.audio.transcriptions.create({
    // OpenAI SDK accepte le ReadStream en Node
    file: stream as unknown as File,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
    language: "fr",
  })) as unknown as {
    text: string;
    language?: string;
    duration?: number;
    words?: WhisperWord[];
    segments?: WhisperSegment[];
  };

  return {
    text: response.text,
    language: response.language ?? "fr",
    duration: response.duration ?? 0,
    words: response.words ?? [],
    segments: response.segments,
  };
}
