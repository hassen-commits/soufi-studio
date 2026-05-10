import { logger } from "../../lib/logger.js";
import { env } from "../../env.js";

const RESEND_API = "https://api.resend.com/emails";

export interface SendNewsletterInput {
  subject: string;
  citation: { text: string; author: string; work?: string };
  episode?: { title: string; url: string };
  intro?: string;
  to?: string[];
}

export interface SendNewsletterOutput {
  id: string;
  to: string[];
  ok: true;
}

function renderHtml(input: SendNewsletterInput): string {
  const { citation, episode, intro } = input;
  const introHtml = intro
    ? `<p style="margin:0 0 24px;color:#1a1a2e;font-size:16px;line-height:1.6">${escapeHtml(intro)}</p>`
    : "";
  const episodeHtml = episode
    ? `<div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(201,169,110,0.3);text-align:center">
         <p style="margin:0 0 12px;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a96e">Cette semaine</p>
         <p style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:24px;color:#1a1a2e">${escapeHtml(episode.title)}</p>
         <a href="${escapeHtml(episode.url)}" style="display:inline-block;padding:12px 28px;background:#c9a96e;color:#1a1a2e;text-decoration:none;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;border-radius:2px">Écouter l'épisode</a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background-color:#f6f1e7;font-family:Georgia,serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:48px 16px">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid rgba(201,169,110,0.3)">
          <tr>
            <td style="padding:48px 40px">
              <p style="margin:0;text-align:center;color:#c9a96e;font-size:24px">۞</p>
              <h1 style="margin:24px 0 0;text-align:center;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:500;color:#1a1a2e;font-size:28px">Soufi Studio</h1>
              <div style="margin:32px auto;width:120px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,169,110,0.6),transparent)"></div>
              ${introHtml}
              <blockquote style="margin:32px 0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:22px;line-height:1.55;color:#1a1a2e;text-align:center;border:none;padding:0">
                « ${escapeHtml(citation.text)} »
              </blockquote>
              <p style="margin:0;text-align:center;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;color:#c9a84c;font-size:18px">— ${escapeHtml(citation.author)}</p>
              ${citation.work ? `<p style="margin:8px 0 0;text-align:center;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#6c7280">${escapeHtml(citation.work)}</p>` : ""}
              ${episodeHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(201,169,110,0.2);background:#fcfaf5;text-align:center">
              <p style="margin:0;font-size:12px;color:#6c7280">
                <a href="https://studio.iavance.fr" style="color:#c9a96e;text-decoration:none">studio.iavance.fr</a>
                · Passion_Coran · IAVANCE
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendNewsletter(
  input: SendNewsletterInput,
): Promise<SendNewsletterOutput> {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY non configuré dans .env");
  }
  if (!env.NEWSLETTER_FROM) {
    throw new Error(
      "NEWSLETTER_FROM non configuré (ex: 'Soufi Studio <hello@studio.iavance.fr>')",
    );
  }

  const to = input.to ?? (env.NEWSLETTER_TO ? env.NEWSLETTER_TO.split(",") : []);
  if (to.length === 0) {
    throw new Error(
      "Aucun destinataire : passer 'to' dans les params ou définir NEWSLETTER_TO",
    );
  }

  const html = renderHtml(input);

  logger.info(
    { subject: input.subject, recipients: to.length, hasEpisode: Boolean(input.episode) },
    "send_newsletter",
  );

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.NEWSLETTER_FROM,
      to,
      subject: input.subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id, to, ok: true };
}
