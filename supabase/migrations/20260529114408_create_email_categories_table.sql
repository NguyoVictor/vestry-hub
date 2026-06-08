-- Create email_categories table
CREATE TABLE IF NOT EXISTS email_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_categories_tenant ON email_categories(tenant_id);

-- Enable RLS
ALTER TABLE email_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_categories' AND policyname='email_categories_tenant_policy') THEN
    CREATE POLICY "email_categories_tenant_policy" ON email_categories FOR ALL TO authenticated
      USING (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text)
      WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text);
  END IF;
END $$;