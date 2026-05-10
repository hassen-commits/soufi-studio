-- ============================================================
-- SOUFI STUDIO — Setup Supabase pgvector
-- À exécuter UNE FOIS dans le SQL Editor du nouveau projet :
-- https://supabase.com/dashboard/project/icjvjabyhhugkxauytxh/sql/new
-- ============================================================

-- 1. Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Table chunks (corpus principal — créée vide, remplie par le script de migration)
CREATE TABLE IF NOT EXISTS chunks (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Index HNSW sur embedding (recherche rapide)
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. Index pour filtrage par auteur
CREATE INDEX IF NOT EXISTS chunks_author_idx
  ON chunks ((metadata->>'author'));

-- 4. Index full-text français
CREATE INDEX IF NOT EXISTS chunks_content_fts_idx
  ON chunks
  USING gin (to_tsvector('french', content));

-- 5. RPC match_chunks — recherche sémantique avec filtres
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_author text DEFAULT NULL,
  similarity_threshold float DEFAULT 0.0
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunks.id,
    chunks.content,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE
    (filter_author IS NULL OR chunks.metadata->>'author' = filter_author)
    AND 1 - (chunks.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 6. RPC search_chunks_text — recherche full-text français
CREATE OR REPLACE FUNCTION search_chunks_text(
  query_text text,
  match_count int DEFAULT 20,
  filter_author text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  rank float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunks.id,
    chunks.content,
    chunks.metadata,
    ts_rank(to_tsvector('french', chunks.content), plainto_tsquery('french', query_text))::float AS rank
  FROM chunks
  WHERE
    to_tsvector('french', chunks.content) @@ plainto_tsquery('french', query_text)
    AND (filter_author IS NULL OR chunks.metadata->>'author' = filter_author)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

-- 7. Table episodes (productions générées)
CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  mode text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  authors text[] DEFAULT '{}',
  themes text[] DEFAULT '{}',
  citation_ids bigint[] DEFAULT '{}',
  script_md text,
  audio_url text,
  video_long_url text,
  short_clip_urls text[] DEFAULT '{}',
  youtube_id text,
  duration_sec int,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS episodes_status_idx ON episodes (status);
CREATE INDEX IF NOT EXISTS episodes_published_at_idx ON episodes (published_at DESC NULLS LAST);

-- 8. RLS — patrimoine public, lecture libre du corpus chunks
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read chunks" ON chunks;
CREATE POLICY "Public read chunks"
  ON chunks
  FOR SELECT
  USING (true);

-- episodes : lecture publique uniquement des épisodes publiés
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published episodes" ON episodes;
CREATE POLICY "Public read published episodes"
  ON episodes
  FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL);

-- Les RPC match_chunks et search_chunks_text doivent être appelables par anon
GRANT EXECUTE ON FUNCTION match_chunks TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_text TO anon, authenticated;
