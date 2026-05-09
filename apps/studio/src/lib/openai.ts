import OpenAI from "openai";
import { env } from "../env.js";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function embed(text: string): Promise<number[]> {
  const safe = text.slice(0, 8000);
  const res = await client.embeddings.create({
    model: env.EMBEDDING_MODEL,
    input: safe,
  });
  const vec = res.data[0]?.embedding;
  if (!vec) throw new Error("OpenAI embedding empty");
  return vec;
}
