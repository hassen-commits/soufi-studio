import { logger } from "../../lib/logger.js";
import { env } from "../../env.js";

export interface PublishWebhookInput {
  channel: "tiktok" | "instagram_reels" | "twitter" | "linkedin" | "custom";
  text: string;
  media_url?: string;
  scheduled_at?: string;
  metadata?: Record<string, unknown>;
}

export interface PublishWebhookOutput {
  ok: boolean;
  status: number;
  channel: string;
  webhook_response?: unknown;
}

/**
 * POSTe le payload à PUBLISH_WEBHOOK_URL (configurable dans .env).
 * Cette URL peut pointer sur Make / Zapier / n8n / Buffer / un endpoint custom.
 *
 * Le payload reçu côté webhook :
 * {
 *   channel: "tiktok" | "instagram_reels" | "twitter" | "linkedin" | "custom",
 *   text: "...",
 *   media_url: "https://.../short.mp4",
 *   scheduled_at?: "2026-05-12T18:00:00Z",
 *   metadata?: { ... }
 * }
 */
export async function publishWebhook(
  input: PublishWebhookInput,
): Promise<PublishWebhookOutput> {
  if (!env.PUBLISH_WEBHOOK_URL) {
    throw new Error(
      "PUBLISH_WEBHOOK_URL non configuré dans .env — " +
        "définir l'URL de ton scénario Make/Zapier/Buffer pour recevoir les payloads.",
    );
  }

  logger.info(
    {
      channel: input.channel,
      hasMedia: Boolean(input.media_url),
      scheduled: input.scheduled_at,
    },
    "publish_webhook",
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.PUBLISH_WEBHOOK_SECRET) {
    headers["X-Soufi-Secret"] = env.PUBLISH_WEBHOOK_SECRET;
  }

  const res = await fetch(env.PUBLISH_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ source: "soufi-studio", ...input }),
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }

  if (!res.ok) {
    logger.warn({ status: res.status, body }, "publish_webhook non-2xx");
  }

  return {
    ok: res.ok,
    status: res.status,
    channel: input.channel,
    webhook_response: body,
  };
}
