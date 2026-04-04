-- Migration 008: Add Lead Constraints
-- Adds validation constraints to ensure data integrity in leads table

-- Add NOT NULL constraints on required fields
ALTER TABLE leads
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL,
  ALTER COLUMN classification SET NOT NULL;

-- Add CHECK constraints for numeric fields
ALTER TABLE leads
  ADD CONSTRAINT check_lead_score_range CHECK (lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100)),
  ADD CONSTRAINT check_intent_score_range CHECK (intent_score IS NULL OR (intent_score >= 0 AND intent_score <= 100)),
  ADD CONSTRAINT check_financial_score_range CHECK (financial_score IS NULL OR (financial_score >= 0 AND financial_score <= 100)),
  ADD CONSTRAINT check_timeline_score_range CHECK (timeline_score IS NULL OR (timeline_score >= 0 AND timeline_score <= 100)),
  ADD CONSTRAINT check_data_completeness_range CHECK (data_completeness IS NULL OR (data_completeness >= 0 AND data_completeness <= 100)),
  ADD CONSTRAINT check_gpa_range CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 100));

-- Add CHECK constraint for classification enum values
ALTER TABLE leads
  ADD CONSTRAINT check_classification_values CHECK (classification IN ('Hot', 'Warm', 'Cold'));

-- Add CHECK constraint for valid intakes
ALTER TABLE leads
  ADD CONSTRAINT check_intake_timing_values CHECK (intake_timing IS NULL OR intake_timing IN (
    'September 2024', 'January 2025', 'September 2025', 'January 2026',
    'September 2026', 'January 2027', 'Flexible', 'ASAP'
  ));

-- Add CHECK constraint for valid timelines
ALTER TABLE leads
  ADD CONSTRAINT check_timeline_values CHECK (timeline IS NULL OR timeline IN (
    'Urgent (within 3 months)', 'Soon (3-6 months)', 'Flexible (6-12 months)', 'Long-term (1+ years)'
  ));

-- Add CHECK constraint for valid budget ranges
ALTER TABLE leads
  ADD CONSTRAINT check_budget_range_values CHECK (budget_range IS NULL OR budget_range IN (
    'Low (< 1M INR)', 'Medium (1-2M INR)', 'High (> 2M INR)', 'No budget constraint'
  ));

-- Add CHECK constraint for IELTS/PTE scores
ALTER TABLE leads
  ADD CONSTRAINT check_ielts_score_range CHECK (ielts_score IS NULL OR (ielts_score >= 0 AND ielts_score <= 9)),
  ADD CONSTRAINT check_pte_score_range CHECK (pte_score IS NULL OR (pte_score >= 10 AND pte_score <= 90));

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_classification ON leads(classification);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email_created_at ON leads(email, created_at DESC);

-- Create composite indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_leads_classification_created_at ON leads(classification, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_data_completeness ON leads(data_completeness DESC);
