-- Migration 02: Call Sessions
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_call_sid TEXT UNIQUE NOT NULL,
  caller_phone TEXT,
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing','active','completed','dropped','no-answer')),
  language_detected TEXT DEFAULT 'en-IN',
  persona_type TEXT,
  transcript JSONB DEFAULT '[]',
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON call_sessions(created_at DESC);
