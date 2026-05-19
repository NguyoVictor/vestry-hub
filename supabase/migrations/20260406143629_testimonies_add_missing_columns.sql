-- Testimonies: code expects status, author_name, category, testimony_date, is_anonymous
-- DB currently only has is_approved boolean

ALTER TABLE testimonies
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS author_name VARCHAR,
  ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS testimony_date DATE,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_testimonies_tenant_id ON testimonies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_testimonies_status ON testimonies(status);
