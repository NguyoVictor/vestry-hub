-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  category_id TEXT REFERENCES email_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category_id);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_templates' AND policyname='email_templates_tenant_policy') THEN
    CREATE POLICY "email_templates_tenant_policy" ON email_templates FOR ALL TO authenticated
      USING (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text)
      WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text);
  END IF;
END $$;