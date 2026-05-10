# @soufi/studio — Backend orchestrateur

Hono + Anthropic SDK + Tool Use. Remplace les workflows n8n.

## Endpoints

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Info service |
| GET | `/health` | Healthcheck |
| POST | `/chat` | Chat soufi (RAG + réponse littéraire) |
| POST | `/podcast` | Génération script de podcast (option : audio) |
| GET | `/media/*` | Sert les MP3 générés localement |

## Démarrage

```powershell
# 1. Setup Supabase (à faire UNE fois)
# Coller supabase/setup.sql dans le SQL Editor Supabase

# 2. Renseigner .env à la racine du monorepo (voir .env.example)

# 3. Lancer
cd apps/studio
pnpm dev
# → http://localhost:3001
```

## Tests rapides (PowerShell)

```powershell
# Health
Invoke-RestMethod -Uri http://localhost:3001/health

# Chat
$body = @{ message = "Que dit Rûmî sur le silence ?" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/chat -Method POST `
  -ContentType "application/json" -Body $body

# Script de podcast (sans audio)
$body = @{
  theme = "Le voyage intérieur du chercheur"
  author = "rumi"
  generate_audio = $false
} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/podcast -Method POST `
  -ContentType "application/json" -Body $body

# Script de podcast AVEC audio (nécessite ELEVENLABS_API_KEY)
$body = @{
  theme = "Le voyage intérieur"
  generate_audio = $true
} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/podcast -Method POST `
  -ContentType "application/json" -Body $body
```

## Structure

```
src/
├── index.ts              ← Hono app, routes, port 3001
├── env.ts                ← validation zod des env vars
├── lib/
│   ├── anthropic.ts      ← client Claude
│   ├── openai.ts         ← embeddings
│   ├── supabase.ts       ← admin (service_role)
│   ├── elevenlabs.ts     ← TTS
│   └── logger.ts         ← pino
├── agent/
│   ├── orchestrator.ts   ← boucle Claude tool-use
│   ├── tools.ts          ← définitions outils + dispatcher
│   ├── prompts.ts        ← system prompts par mode
│   └── handlers/
│       ├── rag-search.ts
│       ├── translate.ts
│       ├── audio.ts
│       ├── render-video.ts
│       ├── publish-youtube.ts
│       ├── publish-webhook.ts
│       └── send-newsletter.ts
└── routes/
    ├── chat.ts
    └── podcast.ts
```

## Outils disponibles pour Claude

- `rag_search(query, author?, limit?)` — recherche sémantique pgvector
- `translate_en_fr(text, source_work?)` — traduction littéraire EN→FR
- `generate_audio(text, slug)` — TTS ElevenLabs (mp3 dans `media/`)
- `render_video(composition, output_filename, props)` — Remotion → MP4 (avec audio synchro)
- `publish_youtube(video_path, title, description, tags?, privacy?, is_short?)` — upload YouTube Data API
- `publish_social(channel, text, media_url?, scheduled_at?)` — webhook générique (Buffer/Make/Zapier)
- `send_newsletter(subject, citation, episode?, intro?)` — newsletter HTML via Resend

---

## Setup distribution (Phase 5b)

### YouTube Data API v3 — OAuth refresh token

1. Va sur https://console.cloud.google.com/apis/credentials
2. Active l'API **YouTube Data API v3** sur le projet
3. Crée un **OAuth client ID** type "Desktop app"
4. Note `client_id` + `client_secret`
5. Récupère le `refresh_token` :
   - Méthode rapide : utilise [OAuth Playground](https://developers.google.com/oauthplayground/)
   - Sélectionne YouTube Data API v3 → scope `https://www.googleapis.com/auth/youtube.upload`
   - Settings ⚙️ → "Use your own OAuth credentials" → colle ton client_id/secret
   - Authorize → Exchange authorization code → copie `refresh_token`
6. Mets dans `.env` :
```env
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

> ⚠️ Quota YouTube : 10 000 unités/jour, 1 upload = 1 600 unités → **max 6 vidéos/jour**.
> Demande quota augmenté via Google Cloud Console si besoin de plus.

### Webhook publication (TikTok / Instagram / Twitter / LinkedIn)

Plutôt que coder une intégration pour chaque plateforme, on poste sur un webhook
configurable. À toi de brancher ce webhook sur :
- **Buffer Pro** (~6 €/mois — TikTok + Instagram + plus)
- **Make.com** (gratuit jusqu'à 1000 ops/mois — flexible)
- **Zapier** (gratuit limité)
- **n8n** (déjà sur ton VPS — peut servir uniquement à ça)

```env
PUBLISH_WEBHOOK_URL=https://hook.eu1.make.com/abc123...
PUBLISH_WEBHOOK_SECRET=optionnel-pour-vérifier-la-source
```

Le webhook reçoit :
```json
{
  "source": "soufi-studio",
  "channel": "tiktok",
  "text": "...",
  "media_url": "https://studio.iavance.fr/media/short.mp4",
  "scheduled_at": "2026-05-12T18:00:00Z"
}
```

### Newsletter Resend

1. Crée un compte sur https://resend.com (gratuit, 3 000 mails/mois)
2. Vérifie ton domaine `iavance.fr` (DKIM/SPF DNS)
3. Crée une API key → mets dans `.env` :
```env
RESEND_API_KEY=re_XXX
NEWSLETTER_FROM=Soufi Studio <hello@studio.iavance.fr>
NEWSLETTER_TO=elfourhassen@gmail.com,abonne1@example.com,...
```

(`NEWSLETTER_TO` est temporaire — passer à une vraie liste mailing en Phase 6 via Supabase `subscribers`.)

---

## Test rapide d'un cycle complet (avec toutes les clés)

```powershell
# Génère un script + audio + vidéo + upload YouTube en une commande
$body = @{
  message = @"
Crée un YouTube Short sur cette citation de Rûmî : "Le silence est la langue de Dieu, tout le reste est une mauvaise traduction."
Étapes :
1. Cherche d'autres passages similaires avec rag_search
2. Génère un script court (30s)
3. Synthétise l'audio avec generate_audio (slug: rumi-silence)
4. Rends la vidéo ShortVertical avec audioUrl=http://localhost:3001<URL retournée par audio>
5. Upload sur YouTube en is_short=true, privacy=unlisted
"@
} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/chat -Method POST -ContentType "application/json" -Body $body
```

## Migration vers Bun

Le code est 100% portable. Pour migrer :
1. Installer Bun : `powershell -c "irm bun.sh/install.ps1 | iex"`
2. Remplacer dans `package.json` :
   - `"dev": "bun --watch --env-file=../../.env src/index.ts"`
3. Remplacer `serve` de `@hono/node-server` par l'export par défaut Hono :
   ```ts
   export default { port: env.PORT, fetch: app.fetch };
   ```

## Coût indicatif

Prompt caching activé sur le system prompt (TTL 5 min).
- 1 chat ≈ 2 000 tokens in + 800 out ≈ 0,015 €
- 1 script podcast ≈ 8 000 tokens in + 4 000 out ≈ 0,06 €
