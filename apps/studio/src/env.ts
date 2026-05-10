import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(20),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  OPENAI_API_KEY: z.string().startsWith("sk-"),
  ELEVENLABS_API_KEY: z.string().min(10).optional(),
  ELEVENLABS_VOICE_ID: z.string().default("ayJ26iqFFJdDB5V9wA0X"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  // YouTube Data API v3 (OAuth refresh-token flow)
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_REFRESH_TOKEN: z.string().optional(),

  // Webhook publish (Buffer / Make / Zapier / n8n)
  PUBLISH_WEBHOOK_URL: z.string().url().optional(),
  PUBLISH_WEBHOOK_SECRET: z.string().optional(),

  // Newsletter (Resend)
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  NEWSLETTER_FROM: z.string().optional(),
  NEWSLETTER_TO: z.string().optional(),

  // Cron + Admin
  CRON_ENABLED: z.coerce.boolean().default(false),
  CRON_TIMEZONE: z.string().default("Europe/Paris"),
  ADMIN_TOKEN: z.string().min(16).optional(),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3001"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n[soufi-studio] Variables d'environnement invalides:\n");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  console.error("\nVérifie ton fichier .env (à la racine du monorepo).\n");
  process.exit(1);
}

export const env = parsed.data;
