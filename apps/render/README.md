# @soufi/render — Pipeline vidéo Remotion

Compositions vidéo pour les deux formats Soufi Studio :
- **PodcastLong** (1920×1080, 30 fps) — vidéo YouTube long format
- **ShortVertical** (1080×1920, 30 fps) — TikTok / Reels / YouTube Shorts

---

## Démarrage

### Studio interactif (preview en temps réel)
```powershell
cd apps/render
pnpm dev
# → s'ouvre dans le navigateur sur http://localhost:3001
```

### Render en MP4
```powershell
# Render le short par défaut (12s, ~1080p vertical)
pnpm render:short

# Render le long par défaut (10s pour test)
pnpm render:long

# Test rapide avec citation custom
pnpm render:test
```

### Render avec props custom
```powershell
pnpm exec remotion render ShortVertical out/rumi.mp4 --props='{"citation":{"text":"...","author":"Rûmî","work":"Mathnawî"}}'
```

---

## Structure

```
src/
├── index.ts            ← entry point Remotion
├── Root.tsx            ← registre des compositions
├── lib/
│   └── theme.ts        ← couleurs, FPS, dimensions
├── components/         ← réutilisables
│   ├── Background.tsx       ← fond navy/gold animé
│   ├── AnimatedQuote.tsx    ← citation mot-par-mot
│   ├── Attribution.tsx      ← auteur + œuvre
│   └── GoldDivider.tsx
└── compositions/
    ├── ShortVertical.tsx
    └── PodcastLong.tsx
```

---

## Props attendus

### ShortVertical
```ts
{
  citation: {
    text: string;       // le texte (sera animé mot par mot)
    author: string;     // "Rûmî"
    work?: string;      // "Mathnawî"
  };
  brand?: string;       // default: "Passion_Coran"
}
```

### PodcastLong
```ts
{
  title: string;        // titre de l'épisode
  episodeNumber?: number;
  author?: string;
  themeFr?: string;
  brand?: string;
}
```

---

## TODO Phase 5

- Bundling audio (passer audioUrl en prop, utiliser <Audio /> de Remotion)
- Sous-titres burnt-in (depuis transcription Whisper)
- Calcul automatique de durationInFrames depuis la durée audio
- Variantes par maître (Rûmî = ornements floraux, Ibn Arabi = motifs géométriques, etc.)
- Render queue côté studio (POST /render → enqueue → callback)

---

## Charte appliquée

| Variable | Valeur |
|---|---|
| Navy fond | `#1a1a2e` |
| Gold primaire | `#c9a96e` |
| Gold light (citations) | `#c9a84c` |
| Parchemin (texte) | `#f6f1e7` |
| Police titres | Cormorant Garamond italic |
| Police corps | Lato |
| Ornement | ۞ (Quranic mark) |
