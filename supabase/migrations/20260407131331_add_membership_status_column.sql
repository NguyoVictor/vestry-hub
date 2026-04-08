ALTER TABLE members
  ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS is_counselor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS salvation_date DATE,
  ADD COLUMN IF NOT EXISTS communication_prefs JSONB DEFAULT '{"email":true,"sms":true,"push":true,"events":true,"newsletter":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS pastoral_notes TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members(membership_status);;
