-- Déduplication contrôlée du corpus Soufi Studio — version sans table temporaire.
-- Peut être relancée sans danger : la sauvegarde possède la même clé primaire que chunks.

BEGIN;

LOCK TABLE public.chunks IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS public.chunks_dedupe_backup_20260822
  (LIKE public.chunks INCLUDING ALL);

ALTER TABLE public.chunks_dedupe_backup_20260822 ENABLE ROW LEVEL SECURITY;

WITH normalized AS (
  SELECT
    id,
    lower(
      regexp_replace(
        trim(COALESCE(NULLIF(content_fr, ''), content)),
        '\s+',
        ' ',
        'g'
      )
    ) AS normalized_text,
    (
      CASE WHEN metadata->>'source_file' IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN COALESCE(metadata->>'work_fr', metadata->>'work') IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN content_fr IS NOT NULL AND trim(content_fr) <> '' THEN 1 ELSE 0 END +
      CASE WHEN COALESCE(metadata->>'language', 'fr') = 'fr' THEN 1 ELSE 0 END
    ) AS metadata_score
  FROM public.chunks
),
ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY normalized_text
      ORDER BY metadata_score DESC, id ASC
    ) AS canonical_rank
  FROM normalized
),
candidates AS (
  SELECT id FROM ranked WHERE canonical_rank > 1
)
INSERT INTO public.chunks_dedupe_backup_20260822
SELECT chunks.*
FROM public.chunks AS chunks
JOIN candidates USING (id)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  backup_count integer;
BEGIN
  SELECT count(*) INTO backup_count
  FROM public.chunks_dedupe_backup_20260822;
  IF backup_count <> 5396 THEN
    RAISE EXCEPTION
      'Sécurité: sauvegarde incomplète, 5396 lignes attendues, % présentes.',
      backup_count;
  END IF;
END $$;

DELETE FROM public.chunks AS chunks
USING public.chunks_dedupe_backup_20260822 AS backup
WHERE chunks.id = backup.id;

DO $$
DECLARE
  remaining_count integer;
BEGIN
  SELECT count(*) INTO remaining_count FROM public.chunks;
  IF remaining_count <> 6742 THEN
    RAISE EXCEPTION
      'Sécurité: 6742 lignes attendues après déduplication, % présentes.',
      remaining_count;
  END IF;
END $$;

COMMIT;

SELECT
  (SELECT count(*) FROM public.chunks) AS corpus_rows,
  (SELECT count(*) FROM public.chunks_dedupe_backup_20260822) AS backed_up_rows;

-- Restauration d'urgence :
-- INSERT INTO public.chunks
-- SELECT * FROM public.chunks_dedupe_backup_20260822
-- ON CONFLICT (id) DO NOTHING;

