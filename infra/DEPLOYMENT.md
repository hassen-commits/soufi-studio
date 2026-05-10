# 🚀 Déploiement — VPS Hostinger + Dokploy + Cloudflare

Cible : faire tourner `studio.iavance.fr` (web) + `api.iavance.fr` (studio backend) sur ton VPS, derrière Cloudflare, avec SSL auto et auto-redéploiement à chaque push GitHub.

---

## 🗺️ Vue d'ensemble

```
                   ┌─────────────────────┐
                   │  GitHub (private)   │
                   │  hassen-commits/    │
                   │  soufi-studio       │
                   └──────────┬──────────┘
                              │ webhook push
                              ↓
                   ┌─────────────────────┐
                   │  Cloudflare DNS+CDN │
                   │  studio.iavance.fr  │
                   │  api.iavance.fr     │
                   └──────────┬──────────┘
                              │ HTTPS
                              ↓
        ┌───────────────────────────────────────────┐
        │   VPS Hostinger 109.176.198.202           │
        │   (Dokploy + Traefik + Docker)            │
        │                                            │
        │   ┌──────────────┐    ┌──────────────┐    │
        │   │ soufi-web    │    │ soufi-studio │    │
        │   │ Next.js 15   │←──→│ Hono+Remotion│    │
        │   │ port 3000    │    │ port 3001    │    │
        │   └──────────────┘    └──────────────┘    │
        │                              │            │
        │                              ↓            │
        │                       Volume soufi-media  │
        │                       (mp3/mp4 générés)   │
        └────────────────────────────┬───────────────┘
                                     ↓
              ┌──────────────────────┼──────────────┐
              ↓                      ↓              ↓
        Supabase (corpus)   Anthropic API     ElevenLabs
        + Postgres pgvector + OpenAI          YouTube
                                              Resend
```

---

## ÉTAPE 1 — DNS Cloudflare (~5 min + propagation)

### 1.1 — Ajouter `iavance.fr` à Cloudflare
1. https://dash.cloudflare.com → Add a Site → `iavance.fr` → Free plan
2. Cloudflare scanne tes DNS actuels (chez Hostinger probablement)
3. Note les **2 nameservers Cloudflare** affichés (ex : `kim.ns.cloudflare.com`, `walt.ns.cloudflare.com`)

### 1.2 — Pointer le domaine sur Cloudflare (côté Hostinger)
1. https://hpanel.hostinger.com → Domaines → `iavance.fr` → DNS / Nameservers
2. Change pour **Custom nameservers** → colle les 2 NS Cloudflare
3. Sauvegarde. Propagation : **5 min à 24h**.

### 1.3 — Créer les enregistrements A sur Cloudflare
Une fois Cloudflare actif (badge "Active" en vert) :

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `studio` | `109.176.198.202` | 🟧 Proxied |
| A | `api` | `109.176.198.202` | 🟧 Proxied |
| A | `cdn` | `109.176.198.202` | 🟧 Proxied (pour les médias) |

> ⚠️ **Proxy 🟧 ON** = Cloudflare gère SSL + CDN + protection DDoS. C'est ce qu'on veut.

---

## ÉTAPE 2 — Préparer l'environnement (sur le VPS)

### 2.1 — SSH sur le VPS
```bash
ssh root@109.176.198.202
```

### 2.2 — Vérifier Dokploy
```bash
# Doit déjà tourner d'après ton infra
docker ps | grep dokploy

# Sinon installation : voir https://docs.dokploy.com/installation
```

### 2.3 — Pré-clone du repo (optionnel pour tests CLI)
```bash
mkdir -p ~/soufi && cd ~/soufi
git clone https://github.com/hassen-commits/soufi-studio.git
cd soufi-studio
```

---

## ÉTAPE 3 — Créer les apps dans Dokploy

Va sur l'UI Dokploy de ton VPS (généralement `https://dokploy.<ton-vps>:3000`).

### 3.1 — App `soufi-studio` (backend)
1. **+ Create Application** → "Application"
2. **Source** : Git → `https://github.com/hassen-commits/soufi-studio` → branche `main`
3. **Auth** : ajoute ton GitHub PAT (https://github.com/settings/tokens → repo scope) si repo privé
4. **Build Type** : **Dockerfile**
5. **Dockerfile path** : `infra/Dockerfile.studio`
6. **Build context** : `.` (racine du repo)
7. **Port** : `3001`
8. **Domains** :
   - Host : `api.iavance.fr`
   - HTTPS : ✅ (Dokploy/Traefik gère le cert via Cloudflare)
9. **Environment Variables** : copier toutes les valeurs du `.env` local
   - ⚠️ Important : **ne pas** mettre `CRON_ENABLED=true` au premier déploiement, pour valider d'abord
10. **Volumes** :
    - Type : Volume → Name : `soufi-media` → Mount : `/app/apps/studio/media`
11. **Deploy**

### 3.2 — App `soufi-web` (frontend)
1. **+ Create Application** → idem
2. **Dockerfile path** : `infra/Dockerfile.web`
3. **Port** : `3000`
4. **Domain** : `studio.iavance.fr` (HTTPS ✅)
5. **Build Args** (à ajouter dans Dokploy → Build Args) :
   - `NEXT_PUBLIC_SUPABASE_URL=https://icjvjabyhhugkxauytxh.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...`
   - `NEXT_PUBLIC_SITE_URL=https://studio.iavance.fr`
6. **Environment Variables** :
   - Mêmes valeurs `NEXT_PUBLIC_*`
   - `SUPABASE_SERVICE_KEY=...` (pour les pages admin)
7. **Deploy**

### 3.3 — Webhook GitHub auto-deploy
Dans Dokploy app Settings → **Auto Deploy** → copie l'URL webhook.
Sur GitHub : Repo Settings → Webhooks → Add webhook → URL Dokploy + `application/json`.
À chaque push sur `main`, Dokploy redéploie. ✨

---

## ÉTAPE 4 — Validation après déploiement

### 4.1 — Vérifs HTTP
```bash
curl -i https://studio.iavance.fr/                           # 200, page d'accueil
curl -i https://studio.iavance.fr/podcast/rss.xml            # 200, application/rss+xml
curl -i https://api.iavance.fr/health                        # 200, {"status":"ok"}
curl -i -H "Authorization: Bearer $ADMIN_TOKEN" \
        https://api.iavance.fr/admin/stats                   # 200, counts par status
```

### 4.2 — Vérifier les logs
Dans Dokploy app → **Logs** :
- `soufi-studio` : doit afficher `Soufi Studio backend ready on http://localhost:3001` puis `[cron] disabled` (jusqu'à ce que tu actives)
- `soufi-web` : doit afficher `▲ Next.js ... Ready in Xs`

### 4.3 — Activer le cron
Une fois la prod stable :
1. Dokploy → soufi-studio → Environment → ajouter `CRON_ENABLED=true` → Save & Redeploy
2. Vérifier les logs : doit afficher `[cron] 2 jobs registered`

---

## ÉTAPE 5 — Bascule depuis Lovable

### 5.1 — Re-vérifier que `studio.iavance.fr` fonctionne sur le nouveau site
Ouvre https://studio.iavance.fr dans un navigateur incognito.

### 5.2 — Tuer Lovable
- Annule l'abonnement Lovable
- Le projet Lovable peut rester en lecture seule comme backup

### 5.3 — Tuer (ou désactiver) n8n
- Dans n8n : désactive les workflows `Main Engine v2`, `TTS Audio`, `YouTube Publisher`
- Garde n8n actif 2-3 semaines comme filet, puis arrête le container Docker

---

## 🛡️ Sécurité prod

### Pages /admin (Web)
Pas d'auth UI. Trois options pour protéger en prod :
1. **Cloudflare Access** (gratuit pour <50 users) : règle "Bypass for `admin@iavance.fr` only" sur `/admin/*`
2. **HTTP Basic Auth** via Traefik middleware dans Dokploy
3. **NextAuth.js** dans le code (à ajouter)

### Routes /admin (Studio)
Déjà protégées par `Authorization: Bearer $ADMIN_TOKEN` si `ADMIN_TOKEN` est défini.

### Secrets
- ⚠️ Révoquer les clés exposées dans le CLAUDE.md original (Supabase service_role, OpenAI, ElevenLabs)
- Dokploy stocke les env vars chiffrées
- Activer 2FA GitHub + Cloudflare + Hostinger

---

## 📊 Monitoring

### Logs (gratuit, sur le VPS)
```bash
docker logs -f soufi-studio
docker logs -f soufi-web
```

### Uptime Kuma (recommandé, self-hosted)
```bash
# Sur le VPS, via Dokploy ou docker run
docker run -d --name uptime-kuma \
  -p 3030:3001 -v uptime-kuma:/app/data \
  --restart=always louislam/uptime-kuma:1
```
Puis ajoute des moniteurs HTTP sur `https://studio.iavance.fr` et `https://api.iavance.fr/health`.

### Plausible (analytics RGPD-friendly, self-hosted)
Plus tard, après stabilisation.

---

## 🆘 Troubleshooting

### "503 Service Unavailable" sur les domains
- Cloudflare proxy 🟧 → vérifier que c'est bien activé
- Dokploy → app → Settings → vérifier le port et le Host (HTTP/HTTPS)
- Traefik logs : `docker logs dokploy-traefik`

### "Bad Gateway" sur api.iavance.fr
- Studio container probablement crashed → `docker logs soufi-studio`
- Causes typiques : env vars manquantes, table `chunks` inaccessible (RLS, mauvaise URL Supabase)

### Premier render lent (>2 min)
- Normal : Remotion télécharge Chromium au premier render (~150 MB)
- Suivants : <60s pour un short, <3min pour un long (selon CPU VPS)

### Build OOM (out of memory) côté Dokploy
- Ton VPS Hostinger a-t-il assez de RAM ? Le build Next.js peut consommer 2-4 GB.
- Solution : build localement et pousse l'image sur Docker Hub / GHCR puis fait un `docker pull` au déploiement.

---

## 💸 Coûts d'exploitation mensuels

| Poste | Coût |
|---|---|
| VPS Hostinger | ~10 € |
| Domaine iavance.fr | ~1 €/mois amorti |
| Cloudflare (Free) | 0 € |
| Supabase Free | 0 € (500 MB DB, 1 GB storage) |
| Anthropic API (~30 chats/jour) | ~10 € |
| OpenAI embeddings (rare) | ~1 € |
| ElevenLabs Starter | 22 € |
| Resend (3000 mails/mois) | 0 € |
| Buffer (optionnel) | 6 € |
| YouTube + RSS | 0 € |
| **TOTAL** | **~50 €/mois** |

vs ancien stack : Lovable (20-50 €) + n8n self-hosted = même infra mais moins flexible.

---

## ✅ Checklist finale

- [ ] DNS pointe sur Cloudflare (NS changés chez Hostinger)
- [ ] 3 records A créés sur Cloudflare (`studio`, `api`, `cdn`)
- [ ] App `soufi-studio` créée et live sur `api.iavance.fr/health` (200 OK)
- [ ] App `soufi-web` créée et live sur `studio.iavance.fr` (citations affichées)
- [ ] Webhook GitHub configuré (auto-deploy)
- [ ] Setup SQL exécuté sur Supabase (table chunks, RPC, RLS, episodes)
- [ ] Tous les env vars renseignés dans Dokploy (Anthropic, OpenAI, ElevenLabs, etc.)
- [ ] CRON_ENABLED=true (après validation manuelle)
- [ ] Lovable annulé / tueable
- [ ] n8n workflows désactivés
- [ ] /admin protégé (Cloudflare Access ou autre)
- [ ] Uptime Kuma configuré (monitoring)

🕌 **Bonne mise en orbite, Hassen.**
