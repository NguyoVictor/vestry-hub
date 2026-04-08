-- announcements: code updates view_count, also uses category and status fields

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();;
