# 🕌 Soufi Studio

> Bibliothèque et studio soufi — patrimoine spirituel des grands maîtres pour le public francophone.

Monorepo Turborepo (pnpm) — Next.js 15, Tailwind, Supabase pgvector, Anthropic Claude.

---

## 🏗️ Structure

```
soufi-studio/
├── apps/
│   ├── web/         ← Next.js 15 — bibliothèque publique (PHASE 1 ✅)
│   ├── studio/      ← Hono + Bun — backend orchestrateur (PHASE 3 — à venir)
│   └── render/      ← Remotion — pipeline vidéo (PHASE 4 — à venir)
├── packages/
│   ├── content/     ← Types Citation, Maître, Episode + métadonnées maîtres
│   ├── db/          ← Client Supabase typé + queries
│   ├── ai/          ← (à venir) Wrappers Anthropic / OpenAI
│   └── ui/          ← (à venir) Composants shadcn partagés
└── infra/           ← Dockerfiles, docker-compose, Dokploy
```

---

## 🚀 Démarrage Rapide

### 1. Pré-requis
- Node 20+ ✅
- pnpm 9+ ✅
- Bun (optionnel, pour la Phase 3)

### 2. Configuration `.env`

Copier `.env.example` à la racine vers `.env` puis renseigner **au minimum** :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://eeqwxxstrmnqurmtbhfj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la clé anon publique>
```

> ⚠️ **Important** : le CLAUDE.md d'origine contient une `service_role` key, **pas** une `anon` key. Pour le frontend, utiliser la clé `anon` publique (Supabase Dashboard → Project Settings → API → `anon public`). La `service_role` reste pour le backend seul.

### 3. Lancer le site

```powershell
pnpm install   # déjà fait
pnpm dev       # démarre toutes les apps via Turborepo
```

Ou seulement l'app web :

```powershell
cd apps/web
pnpm dev
```

→ Ouvrir http://localhost:3000

---

## 📄 Pages Live (Phase 1)

| URL | Description |
|---|---|
| `/` | Accueil — citations aléatoires + maîtres |
| `/bibliotheque` | Liste paginée + filtres par maître |
| `/bibliotheque?auteur=rumi` | Filtré sur Rûmî |
| `/maitres` | Index des maîtres |
| `/maitres/rumi` | Bio + œuvres + extraits Rûmî |
| `/maitres/ibn_arabi` | Idem pour Ibn ʿArabî |
| `/citations/[author]/[slug]` | 1 citation = 1 URL (clé pour SEO + partage) |
| `/episodes` | Placeholder podcast/YouTube |
| `/themes` | Placeholder thèmes |

---

## 🎨 Charte

| | |
|---|---|
| Navy | `#1a1a2e` (`navy-700`) |
| Gold | `#c9a96e` (`gold`) |
| Gold light | `#c9a84c` (`gold-light`) |
| Parchemin | `#f6f1e7` |
| Titres | Cormorant Garamond italic |
| Corps | Lato |
| Arabe | Amiri |

---

## ✅ Phase 1 — TERMINÉE

- Monorepo Turborepo scaffold
- Next.js 15 App Router + Tailwind v3 + typographies Google Fonts
- Charte Soufi appliquée (couleurs, typo, ornements)
- Composants `CitationCard`, `MaitreCard`, `SiteHeader`, `SiteFooter`
- Pages : home, bibliothèque, maîtres, maître/[slug], citation/[author]/[slug], épisodes, thèmes, 404
- Connexion Supabase typée (lecture corpus existant)
- Pagination + filtres maîtres
- Métadonnées des 5 maîtres (Rûmî, Ibn ʿArabî, Ghazâlî, Tustarî, Maîtres soufis) avec bios FR
- TypeScript strict + lint propre
- Dev server validé (HTTP 200)

---

## 🔜 Phase 2 — Prochaines étapes (avant d'attaquer le backend)

1. **Renseigner `.env`** avec la clé `anon` Supabase pour voir les vraies citations
2. **OG images dynamiques** : créer `app/api/og/route.tsx` avec `@vercel/og` (image partage par citation)
3. **Sitemap + robots.txt** pour SEO
4. **Recherche full-text** sur le corpus (`/recherche?q=...`)
5. **Schema.org Quotation** dans le `<head>` de chaque citation (Google rich snippets)
6. **MDX pour bios étendues** des maîtres
7. **Composants UI partagés** dans `packages/ui` (extraction)

## 🔜 Phase 3 — Backend Studio (à venir)

- `apps/studio` — Hono + Bun
- Anthropic SDK + Claude Sonnet 4.6 + tool use
- Tools : rag_search, translate_en_fr, generate_audio, render_video, publish_youtube, publish_short, publish_social
- Migration des workflows n8n (chat, podcast, youtube_script)

## 🔜 Phase 4 — Pipeline Vidéo

- `apps/render` — Remotion
- `PodcastLong.tsx` (16:9 long format)
- `ShortVertical.tsx` (9:16 TikTok/Reels/Shorts)
- Worker de rendu dans Docker

## 🔜 Phase 5-7 — Distribution + Auto + Prod

- YouTube Data API + RSS podcast + Buffer + Resend
- Cron hebdomadaire de production
- Dashboard admin
- Déploiement Dokploy + Cloudflare

---

## 🛠️ Commandes utiles

```powershell
# Dev (toutes les apps via Turbo)
pnpm dev

# Dev uniquement web
pnpm --filter @soufi/web dev

# Typecheck monorepo
pnpm typecheck

# Build production
pnpm build

# Nettoyer caches
pnpm clean
```

---

## 📜 Licence
Privé — IAVANCE / Hassen.
