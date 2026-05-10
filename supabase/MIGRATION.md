# 🔄 Migration corpus Supabase

Guide pour migrer les 13 758 chunks de l'ancien projet `eeqwxxstrmnqurmtbhfj`
vers le nouveau projet **STUDIO SOUFI** `icjvjabyhhugkxauytxh`.

---

## Étape 1 — Préparer le nouveau projet (5 min)

### 1.1 — Récupérer la `service_role` key du **nouveau** projet
1. Va sur https://supabase.com/dashboard/project/icjvjabyhhugkxauytxh/settings/api
2. Section **Project API keys**
3. Copie la valeur de **`service_role` (secret)** — pas la `anon`/`publishable`
4. Garde-la sous la main

### 1.2 — Créer la table + indexes + RPC sur le nouveau projet
1. Va sur https://supabase.com/dashboard/project/icjvjabyhhugkxauytxh/sql/new
2. Copie tout le contenu de `supabase/setup.sql`
3. Colle dans l'éditeur SQL
4. Clique **RUN**
5. Tu dois voir « Success. No rows returned. »

> Ça crée la table `chunks` (vide), les index HNSW + GIN, les RPC `match_chunks` et `search_chunks_text`, et la table `episodes`.

---

## Étape 2 — Lancer la migration (10-15 min selon ta connexion)

### 2.1 — Créer un `.env.migrate` à la **racine** du monorepo
Ce fichier est temporaire et n'est PAS committé (déjà dans `.gitignore`).

```env
# ANCIEN projet (lecture)
OLD_SUPABASE_URL=https://eeqwxxstrmnqurmtbhfj.supabase.co
OLD_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcXd4eHN0cm1ucXVybXRiaGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg4Nzk4NSwiZXhwIjoyMDg4NDYzOTg1fQ.d5QO4SCryMiVxFqTxfco3jW-bpmRXVQEOahyBqPh4B4

# NOUVEAU projet (écriture)
NEW_SUPABASE_URL=https://icjvjabyhhugkxauytxh.supabase.co
NEW_SUPABASE_SERVICE_KEY=<colle ici la service_role du NOUVEAU projet>

# Optionnels
BATCH_SIZE=100
DRY_RUN=false
```

> ⚠️ La clé `service_role` de l'ancien projet est dans ton CLAUDE.md d'origine.

### 2.2 — Tester en mode DRY RUN d'abord (sans rien écrire)
```powershell
cd C:\Users\Sirine\Desktop\soufi-studio

# Edit .env.migrate et mets DRY_RUN=true
# Puis :
pnpm --filter @soufi/studio migrate:corpus
```

Tu dois voir quelque chose comme :
```
🕌 Migration du corpus Soufi Studio
─────────────────────────────────────────
Source : https://eeqwxxstrmnqurmtbhfj.supabase.co
Cible  : https://icjvjabyhhugkxauytxh.supabase.co
Batch  : 100 lignes
Mode   : DRY RUN (aucune écriture)
─────────────────────────────────────────
Ancien projet : 13 758 chunks
Nouveau projet : 0 chunks déjà présents
Progression : 13 758/13 758 (100%) — 13 758 migrés, 0 échecs — 12s
```

### 2.3 — Lancer la VRAIE migration
1. Edit `.env.migrate` : `DRY_RUN=false`
2. Relance :
```powershell
pnpm --filter @soufi/studio migrate:corpus
```

Le script :
- Reprend automatiquement où il s'était arrêté en cas de coupure (basé sur le compte de lignes)
- Réessaie 1× automatiquement en cas d'erreur de batch
- Affiche la progression en temps réel
- Vérifie le compte final

### 2.4 — Vérifier dans le SQL Editor du nouveau projet
```sql
-- Compte total
SELECT COUNT(*) FROM chunks;
-- Attendu : 13758

-- Répartition par auteur
SELECT metadata->>'author' AS auteur, COUNT(*)
FROM chunks
GROUP BY 1
ORDER BY COUNT(*) DESC;

-- Test recherche sémantique (avec un embedding factice)
SELECT id, content, metadata->>'author', similarity
FROM match_chunks(
  ARRAY(SELECT 0.1 FROM generate_series(1, 1536))::vector,
  5,
  'Rumi',
  0.0
);
```

---

## Étape 3 — Pointer le code sur le nouveau projet

### 3.1 — Mettre à jour le `.env` (pas `.env.migrate`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://icjvjabyhhugkxauytxh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la "publishable key" du nouveau projet>
SUPABASE_SERVICE_KEY=<la "service_role" du nouveau projet>
# ... le reste inchangé (Anthropic, OpenAI, ElevenLabs)
```

### 3.2 — Tester
```powershell
# Frontend
cd apps/web && pnpm dev
# → http://localhost:3000 doit afficher les vraies citations

# Backend (autre terminal)
cd apps/studio && pnpm dev
# → POST http://localhost:3001/chat doit répondre avec le RAG
```

---

## Étape 4 — Sécurité (après vérification)

Une fois que tu as confirmé que tout marche sur le nouveau projet (laisse 1 semaine
pour être sûr) :

1. Supprime le fichier `.env.migrate` à la racine
2. (Optionnel) Pause ou supprime l'ancien projet `eeqwxxstrmnqurmtbhfj` depuis le dashboard Supabase

---

## ⚠️ Troubleshooting

### "La table 'chunks' n'existe pas sur le nouveau projet"
→ Tu n'as pas exécuté `supabase/setup.sql`. Reviens à l'étape 1.2.

### Erreur 401 "JWT expired" ou "Invalid API key"
→ Tu utilises la mauvaise clé. Vérifie que c'est bien la **`service_role`** (secret),
pas la `anon`/`publishable`.

### Erreur "vector dimension mismatch"
→ L'ancien projet a peut-être des embeddings d'une autre dimension. Vérifie avec :
```sql
SELECT array_length(embedding::float[], 1) FROM chunks LIMIT 1;
```
Si ce n'est pas 1536, modifie `setup.sql` (ligne `embedding vector(1536)`) avant de relancer.

### Le script semble bloqué
→ Le batch peut prendre du temps sur des connexions lentes. Vérifie ta bande passante.
Tu peux baisser `BATCH_SIZE` à 50 dans `.env.migrate` pour des batches plus petits.

### Migration interrompue
→ Relance simplement le script. Il reprend là où il s'était arrêté (skipNew = newCount lignes déjà présentes).
