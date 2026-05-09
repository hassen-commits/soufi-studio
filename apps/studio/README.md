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
│       └── audio.ts
└── routes/
    ├── chat.ts
    └── podcast.ts
```

## Outils disponibles pour Claude

- `rag_search(query, author?, limit?)` — recherche sémantique pgvector
- `translate_en_fr(text, source_work?)` — traduction littéraire
- `generate_audio(text, slug)` — TTS ElevenLabs (mp3 dans `media/`)

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
