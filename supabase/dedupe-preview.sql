-- Audit non destructif des doublons exacts du corpus.
-- Ce fichier ne supprime et ne modifie aucune ligne.

WITH normalized AS (
  SELECT
    id,
    metadata->>'author' AS author,
    COALESCE(metadata->>'work_fr', metadata->>'work', 'Non renseigné') AS work,
    metadata->>'source_file' AS source_file,
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
    *,
    count(*) OVER (PARTITION BY normalized_text) AS copies,
    row_number() OVER (
      PARTITION BY normalized_text
      ORDER BY metadata_score DESC, id ASC
    ) AS canonical_rank
  FROM normalized
)
SELECT
  work,
  count(*) FILTER (WHERE copies > 1) AS rows_in_duplicate_groups,
  count(*) FILTER (WHERE canonical_rank > 1) AS removable_candidates,
  count(DISTINCT normalized_text) FILTER (WHERE copies > 1) AS duplicate_groups
FROM ranked
GROUP BY work
HAVING count(*) FILTER (WHERE copies > 1) > 0
ORDER BY removable_candidates DESC;

-- Pour examiner les lignes candidates sans les supprimer :
-- Remplacer le SELECT ci-dessus par :
-- SELECT id, author, work, source_file, copies, canonical_rank
-- FROM ranked
-- WHERE canonical_rank > 1
-- ORDER BY normalized_text, canonical_rank;

