import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { env } from "../env.js";

const BASE = "https://api.elevenlabs.io/v1";

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputPath: string;
}

export async function synthesize(opts: TTSOptions): Promise<{ path: string; bytes: number }> {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY manquant");
  }
  const voiceId = opts.voiceId ?? env.ELEVENLABS_VOICE_ID;
  const url = `${BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: opts.modelId ?? "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.85,
        style: 0.15,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 300)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(opts.outputPath), { recursive: true });
  await writeFile(opts.outputPath, buf);
  return { path: opts.outputPath, bytes: buf.byteLength };
}

export function audioOutPath(slug: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return join(process.cwd(), "media", `${stamp}-${safe}.mp3`);
}
