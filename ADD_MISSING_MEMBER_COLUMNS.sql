-- Run this SQL directly in Supabase Dashboard > SQL Editor
-- This adds missing columns that the member profile form expects

-- Add missing columns to members table
ALTER TABLE members 
  ADD COLUMN IF NOT EXISTS city VARCHAR,
  ADD COLUMN IF NOT EXISTS state VARCHAR,
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR,
  ADD COLUMN IF NOT EXISTS is_counselor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS salvation_date DATE,
  ADD COLUMN IF NOT EXISTS communication_prefs JSONB DEFAULT '{"email":true,"sms":true,"push":true,"events":true,"newsletter":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS pastoral_notes TEXT,
  ADD COLUMN IF NOT EXISTS occupation VARCHAR;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'members' 
  AND table_schema = 'public'
  AND column_name IN ('city', 'state', 'postal_code', 'is_counselor', 'salvation_date', 'communication_prefs', 'pastoral_notes', 'occupation')
ORDER BY column_name;