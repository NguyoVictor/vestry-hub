-- Add missing columns to members table that are expected by the UI
-- These columns were referenced in migrations but may not have been applied

ALTER TABLE members 
  ADD COLUMN IF NOT EXISTS city VARCHAR,
  ADD COLUMN IF NOT EXISTS state VARCHAR,
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR,
  ADD COLUMN IF NOT EXISTS is_counselor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS salvation_date DATE,
  ADD COLUMN IF NOT EXISTS communication_prefs JSONB DEFAULT '{"email":true,"sms":true,"push":true,"events":true,"newsletter":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS pastoral_notes TEXT,
  ADD COLUMN IF NOT EXISTS occupation VARCHAR;
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_city ON members(city);
CREATE INDEX IF NOT EXISTS idx_members_is_counselor ON members(is_counselor);
CREATE INDEX IF NOT EXISTS idx_members_occupation ON members(occupation);
-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
