-- Migration 007: Onboarding Questions Table
-- Stores per-session onboarding Q&A progress for live counsellor brief

CREATE TABLE IF NOT EXISTS onboarding_questions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,         -- e.g. "education_level", "target_countries"
    question_text TEXT NOT NULL,        -- natural language version
    status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','asked','answered','skipped')),
    answer       TEXT,
    asked_at     TIMESTAMPTZ,
    answered_at  TIMESTAMPTZ,
    turn_number  INT,
    source_chunk_id UUID REFERENCES kb_chunks(id),
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oq_session ON onboarding_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_oq_status  ON onboarding_questions(session_id, status);
