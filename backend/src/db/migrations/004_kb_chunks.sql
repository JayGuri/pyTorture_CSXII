-- Migration 04: KB Chunks (text-based search + optional pgvector)
CREATE TABLE IF NOT EXISTS kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id UUID,
  chunk_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  is_verified BOOLEAN DEFAULT true,
  is_stale BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Full-text search index (primary search method — no embedding API needed)
ALTER TABLE kb_chunks ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;
CREATE INDEX IF NOT EXISTS idx_kb_search ON kb_chunks USING gin(search_vector);

-- pgvector index (for future use when embedding API available)
-- CREATE INDEX kb_chunks_embedding_idx ON kb_chunks
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Text-based search function (used instead of vector similarity)
CREATE OR REPLACE FUNCTION search_kb_chunks(
  query_text text,
  match_count int DEFAULT 5
) RETURNS TABLE(id uuid, chunk_text text, source_type text, metadata jsonb, rank real)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id, kb.chunk_text, kb.source_type, kb.metadata,
    ts_rank(kb.search_vector, plainto_tsquery('english', query_text)) AS rank
  FROM kb_chunks kb
  WHERE kb.is_stale = false
    AND kb.search_vector @@ plainto_tsquery('english', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
END; $$;
