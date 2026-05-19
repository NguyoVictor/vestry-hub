-- Option B: store first_name, last_name, conversion_date directly on new_converts
-- new converts are independent of members table

ALTER TABLE new_converts
  ADD COLUMN IF NOT EXISTS first_name VARCHAR,
  ADD COLUMN IF NOT EXISTS last_name VARCHAR,
  ADD COLUMN IF NOT EXISTS phone VARCHAR,
  ADD COLUMN IF NOT EXISTS email VARCHAR,
  ADD COLUMN IF NOT EXISTS conversion_date DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- Drop member_id FK constraint if it exists (make it optional)
ALTER TABLE new_converts ALTER COLUMN member_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_new_converts_tenant_id ON new_converts(tenant_id);
