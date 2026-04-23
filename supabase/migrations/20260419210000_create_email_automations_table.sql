CREATE TABLE IF NOT EXISTS email_automations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  automation_key varchar NOT NULL,
  is_active boolean DEFAULT true,
  template_id varchar REFERENCES email_templates(id) ON DELETE SET NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_system boolean DEFAULT false,
  name varchar,
  description varchar,
  frequency varchar,
  audience varchar,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, automation_key)
);
CREATE INDEX IF NOT EXISTS idx_email_automations_tenant ON email_automations(tenant_id);
ALTER TABLE email_automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_automations_tenant_rls" ON email_automations;
CREATE POLICY "email_automations_tenant_rls" ON email_automations
  FOR ALL USING (tenant_id = get_my_tenant_id());
