-- Add analysis mode and context columns to support separate CV analysis flows
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS analysis_mode TEXT NOT NULL DEFAULT 'job_match',
  ADD COLUMN IF NOT EXISTS ai_context JSONB DEFAULT NULL;

-- analysis_mode: 'general' | 'job_match'
-- ai_context: JSONB with questionnaire answers for 'general' mode, e.g.:
-- {
--   "additionalContext": "..."
-- }
