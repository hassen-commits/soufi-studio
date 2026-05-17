import { env } from "../env.js";
import { logger } from "./logger.js";

const RESEND_API = "https://api.resend.com/emails";

/**
 * Envoie un mail simple à l'admin (NEWSLETTER_TO) pour notifier la fin d'un
 * cycle de production hebdo. Inclut un CTA vers /admin/episodes pour valider.
 *
 * Échec silencieux : on log mais on ne fait pas planter le job — la prod a
 * déjà réussi, l'email n'est qu'une notification.
 */
export async function notifyAdminProductionDone(input: {
  episodeId: string;
  title: string;
  status: string;
  toolCalls: string[];
}): Promise<void> {
  if (!env.RESEND_API_KEY || !env.NEWSLETTER_FROM || !env.NEWSLETTER_TO) {
    logger.info("[notify] Resend not configured — skip admin email");
    return;
  }

  const adminUrl = `${env.PUBLIC_BASE_URL.replace(":3001", "").replace(/\/$/, "")}/admin/episodes`;
  const siteUrl = "https://studio.iavance.fr";

  const html = `<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background:#f6f1e7;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid rgba(201,169,110,0.3)">
      <tr><td style="padding:40px">
        <p style="margin:0;color:#c9a96e;text-align:center">۞</p>
        <h1 style="margin:16px 0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:500;color:#1a1a2e;text-align:center">Nouvel épisode à valider</h1>
        <p style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:22px;color:#1a1a2e;text-align:center;margin:24px 0">${escapeHtml(input.title)}</p>
        <p style="font-size:13px;color:#6c7280;text-align:center;text-transform:uppercase;letter-spacing:0.2em">Statut : ${input.status} · Tools : ${input.toolCalls.join(", ")}</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${adminUrl}" style="display:inline-block;padding:14px 32px;background:#1a1a2e;color:#f6f1e7;text-decoration:none;font-size:13px;letter-spacing:0.2em;text-transform:uppercase">Valider et publier</a>
        </p>
        <p style="font-size:12px;color:#6c7280;text-align:center;margin-top:24px">
          La vidéo est en YouTube unlisted — vérifie le rendu, puis clique "🌐 Public" dans l'admin.
        </p>
      </td></tr>
      <tr><td style="padding:16px;border-top:1px solid rgba(201,169,110,0.2);text-align:center;font-size:11px;color:#6c7280">
        <a href="${siteUrl}" style="color:#c9a96e;text-decoration:none">studio.iavance.fr</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  try {
    const to = env.NEWSLETTER_TO.split(",").map((s) => s.trim());
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.NEWSLETTER_FROM,
        to,
        subject: `[Soufi Studio] À valider : ${input.title}`,
        html,
      }),
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status, body: (await res.text()).slice(0, 200) },
        "[notify] Resend admin email failed",
      );
    } else {
      logger.info({ episodeId: input.episodeId }, "[notify] admin email sent");
    }
  } catch (e) {
    logger.warn({ err: String(e) }, "[notify] admin email exception");
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
