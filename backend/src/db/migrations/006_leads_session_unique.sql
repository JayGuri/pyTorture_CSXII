-- Migration 06: Enforce one lead row per session for upsert(on_conflict=session_id)

-- 1) Remove duplicate rows while keeping the latest row per session_id.
WITH ranked AS (
  SELECT
    id,
    session_id,
    ROW_NUMBER() OVER (
      PARTITION BY session_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM leads
  WHERE session_id IS NOT NULL
)
DELETE FROM leads AS l
USING ranked AS r
WHERE l.id = r.id
  AND r.rn > 1;

-- 2) Add UNIQUE(session_id) required by PostgREST upsert on_conflict=session_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_session_id_unique'
      AND conrelid = 'leads'::regclass
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_session_id_unique UNIQUE (session_id);
  END IF;
END $$;
