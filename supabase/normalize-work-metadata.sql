-- Normalise les titres d'œuvres connus sans inventer les 757 provenances manquantes.
-- Le script est rejouable et conserve une sauvegarde des lignes modifiées.

BEGIN;

CREATE TABLE IF NOT EXISTS public.chunks_work_metadata_backup_20260822 AS
SELECT *
FROM public.chunks
WHERE false;

INSERT INTO public.chunks_work_metadata_backup_20260822
SELECT c.*
FROM public.chunks AS c
WHERE c.metadata->>'work' IN (
  'rumi_mathnawi_fr',
  'Mathnawi',
  'ibnarabi_fusus_al_hikam_fr',
  'al_jazairi_livre_des_haltes_t1_fr',
  'Commentaire spirituel du Coran — Al-Tustari',
  'Le Tabernacle des Lumières'
)
AND COALESCE(c.metadata->>'work_fr', '') = ''
AND NOT EXISTS (
  SELECT 1
  FROM public.chunks_work_metadata_backup_20260822 AS b
  WHERE b.id = c.id
);

UPDATE public.chunks
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{work_fr}',
  to_jsonb(
    CASE metadata->>'work'
      WHEN 'rumi_mathnawi_fr' THEN 'Le Mathnawî'
      WHEN 'Mathnawi' THEN 'Le Mathnawî'
      WHEN 'ibnarabi_fusus_al_hikam_fr' THEN 'Les Chatons des sagesses (Fuṣūṣ al-ḥikam)'
      WHEN 'al_jazairi_livre_des_haltes_t1_fr' THEN 'Le Livre des Haltes, tome I'
      WHEN 'Commentaire spirituel du Coran — Al-Tustari' THEN 'Commentaire spirituel du Coran'
      WHEN 'Le Tabernacle des Lumières' THEN 'Le Tabernacle des Lumières'
    END
  ),
  true
)
WHERE metadata->>'work' IN (
  'rumi_mathnawi_fr',
  'Mathnawi',
  'ibnarabi_fusus_al_hikam_fr',
  'al_jazairi_livre_des_haltes_t1_fr',
  'Commentaire spirituel du Coran — Al-Tustari',
  'Le Tabernacle des Lumières'
)
AND COALESCE(metadata->>'work_fr', '') = '';

DO $$
DECLARE
  remaining_known_titles integer;
BEGIN
  SELECT count(*)
  INTO remaining_known_titles
  FROM public.chunks
  WHERE metadata->>'work' IN (
    'rumi_mathnawi_fr',
    'Mathnawi',
    'ibnarabi_fusus_al_hikam_fr',
    'al_jazairi_livre_des_haltes_t1_fr',
    'Commentaire spirituel du Coran — Al-Tustari',
    'Le Tabernacle des Lumières'
  )
  AND COALESCE(metadata->>'work_fr', '') = '';

  IF remaining_known_titles <> 0 THEN
    RAISE EXCEPTION 'Normalisation incomplète : % titre(s) connu(s) restent sans work_fr',
      remaining_known_titles;
  END IF;
END $$;

COMMIT;

-- Vérification : remaining_known_titles doit valoir 0.
SELECT
  (SELECT count(*) FROM public.chunks_work_metadata_backup_20260822) AS backed_up_rows,
  count(*) FILTER (
    WHERE metadata->>'work' IN (
      'rumi_mathnawi_fr',
      'Mathnawi',
      'ibnarabi_fusus_al_hikam_fr',
      'al_jazairi_livre_des_haltes_t1_fr',
      'Commentaire spirituel du Coran — Al-Tustari',
      'Le Tabernacle des Lumières'
    )
    AND COALESCE(metadata->>'work_fr', '') = ''
  ) AS remaining_known_titles,
  count(*) FILTER (
    WHERE COALESCE(metadata->>'work_fr', metadata->>'work', '') = ''
  ) AS genuinely_unknown_works
FROM public.chunks;
