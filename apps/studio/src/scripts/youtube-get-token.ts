/**
 * Flow OAuth 2.0 local pour obtenir un REFRESH_TOKEN YouTube.
 *
 * Usage :
 *   tsx src/scripts/youtube-get-token.ts
 *
 * - Lance un serveur HTTP éphémère sur http://localhost:53682
 * - Ouvre le navigateur sur la page de consentement Google
 * - Capture le `code` sur le callback
 * - L'échange contre un refresh_token et l'affiche
 *
 * Coller ensuite le token dans .env → YOUTUBE_REFRESH_TOKEN=...
 */
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { env } from "../env.js";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/youtube", // manage account (channels.update, etc.)
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

if (!env.YOUTUBE_CLIENT_ID || !env.YOUTUBE_CLIENT_SECRET) {
  console.error(
    "YOUTUBE_CLIENT_ID et YOUTUBE_CLIENT_SECRET doivent être définis dans .env.",
  );
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", env.YOUTUBE_CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith("/callback")) {
    res.writeHead(404).end("Not Found");
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Erreur OAuth : ${error ?? "code manquant"}`);
    console.error("OAuth error:", error);
    server.close();
    process.exit(1);
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.YOUTUBE_CLIENT_ID!,
        client_secret: env.YOUTUBE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`token exchange ${tokenRes.status}: ${body}`);
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<h2>Refresh token reçu — tu peux fermer cet onglet.</h2>" +
        "<p>Retour au terminal pour le copier dans .env.</p>",
    );

    console.log("");
    console.log("=== TOKENS REÇUS ===");
    console.log("Scope:", tokens.scope);
    console.log("Access token (1h) :", tokens.access_token.slice(0, 30) + "...");
    if (!tokens.refresh_token) {
      console.error(
        "\n⚠️  AUCUN refresh_token retourné. Solutions :\n" +
          "1. Vérifie que ce client OAuth n'a jamais été autorisé pour ce compte " +
          "(sinon Google ne renvoie pas le refresh à nouveau).\n" +
          "2. Va sur https://myaccount.google.com/permissions, révoque l'accès, " +
          "puis relance ce script.",
      );
    } else {
      console.log("\n✅ YOUTUBE_REFRESH_TOKEN à coller dans .env :\n");
      console.log("    " + tokens.refresh_token + "\n");
    }
  } catch (e) {
    res.writeHead(500).end(String(e));
    console.error(e);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Serveur callback OAuth sur ${REDIRECT_URI}\n`);
  console.log("J'ouvre ton navigateur sur la page de consentement Google.");
  console.log("Connecte-toi avec le compte qui possède la chaîne Passion_Coran.\n");
  console.log("Si le navigateur ne s'ouvre pas, copie-colle cette URL :\n");
  console.log(authUrl.toString());
  console.log("");
  const cmd =
    process.platform === "win32"
      ? `start "" "${authUrl.toString()}"`
      : process.platform === "darwin"
        ? `open "${authUrl.toString()}"`
        : `xdg-open "${authUrl.toString()}"`;
  exec(cmd);
});
