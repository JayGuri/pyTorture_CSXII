-- Migration 05: KB Gaps
CREATE TABLE IF NOT EXISTS kb_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES call_sessions(id),
  question TEXT NOT NULL,
  context TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','researching','resolved','dismissed')),
  answer TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gaps_status ON kb_gaps(status);

-- Migration 06: Live Cache (Supabase fallback for Redis)
CREATE TABLE IF NOT EXISTS live_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  source_url TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
