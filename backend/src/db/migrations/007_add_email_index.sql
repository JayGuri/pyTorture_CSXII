-- Migration 007: Add email index for performance
-- Allows efficient querying of leads by email in ForYouService

-- Create index on email column for faster lookups
CREATE INDEX idx_leads_email ON leads(email);

-- Create composite index on email + created_at for ordered queries
CREATE INDEX idx_leads_email_created_at ON leads(email, created_at DESC);

-- Add NOT NULL constraint to email once it's populated via voice agent
-- (For now, email can be NULL during initial lead creation)
-- Future: ALTER TABLE leads ALTER COLUMN email SET NOT NULL;

-- Document the email lookup pattern:
-- ForYouService.get_lead_by_email() will now use these indexes efficiently
-- Query: SELECT * FROM leads WHERE email = $1 ORDER BY created_at DESC LIMIT 1
