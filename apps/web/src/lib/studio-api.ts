/**
 * Helper côté serveur pour appeler le backend studio (Hono).
 *
 * En dev : STUDIO_URL = http://localhost:3001
 * En prod : STUDIO_URL = http://soufi-studio:3001 (réseau Docker interne Dokploy)
 *           ou l'URL publique si exposée via Traefik.
 *
 * Toutes les routes /admin/* du studio sont protégées par Bearer ADMIN_TOKEN.
 */

const STUDIO_URL = process.env.STUDIO_URL ?? "http://localhost:3001";

function authHeaders(): HeadersInit {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    throw new Error(
      "ADMIN_TOKEN manquant côté apps/web — l'admin du studio ne peut pas être appelé.",
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export interface CreateEpisodeInput {
  title: string;
  themeFr?: string;
  author?: string;
  description?: string;
  slug?: string;
}

export async function studioCreateEpisode(input: CreateEpisodeInput) {
  const res = await fetch(`${STUDIO_URL}/admin/episodes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`studio createEpisode ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function studioProduceEpisode(id: string) {
  const res = await fetch(`${STUDIO_URL}/admin/episodes/${id}/produce`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`studio produceEpisode ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function studioSetPrivacy(
  id: string,
  privacy: "public" | "unlisted" | "private",
) {
  const res = await fetch(`${STUDIO_URL}/admin/episodes/${id}/privacy`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ privacy }),
  });
  if (!res.ok) {
    throw new Error(`studio setPrivacy ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function studioDeleteEpisode(id: string) {
  const res = await fetch(`${STUDIO_URL}/admin/episodes/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`studio deleteEpisode ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
