-- Migration : ajout d'une colonne content_fr sur la table chunks
-- pour stocker les traductions françaises des chunks anglais.
-- À exécuter dans l'éditeur SQL Supabase.

ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS content_fr TEXT;

-- Index optionnel sur la présence d'une traduction
-- (utile pour SELECT WHERE content_fr IS NOT NULL en volume).
CREATE INDEX IF NOT EXISTS idx_chunks_has_content_fr
  ON chunks ((content_fr IS NOT NULL))
  WHERE content_fr IS NOT NULL;
