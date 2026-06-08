-- Create email_automations table
CREATE TABLE IF NOT EXISTS email_automations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  automation_key TEXT NOT NULL, -- Unique key for the automation type
  name TEXT,
  description TEXT,
  frequency TEXT,
  audience TEXT,
  template_id TEXT REFERENCES email_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}', -- Store configuration options
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, automation_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_automations_tenant ON email_automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_automations_active ON email_automations(is_active);
CREATE INDEX IF NOT EXISTS idx_email_automations_key ON email_automations(automation_key);

-- Enable RLS
ALTER TABLE email_automations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_automations' AND policyname='email_automations_tenant_policy') THEN
    CREATE POLICY "email_automations_tenant_policy" ON email_automations FOR ALL TO authenticated
      USING (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text)
      WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text);
  END IF;
END $$;