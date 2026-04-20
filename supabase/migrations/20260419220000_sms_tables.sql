-- SMS credentials per tenant
CREATE TABLE IF NOT EXISTS sms_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  at_username varchar,
  at_api_key varchar,
  at_sender_id varchar,
  is_configured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_settings_tenant" ON sms_settings FOR ALL USING (tenant_id = get_my_tenant_id());

-- SMS history
CREATE TABLE IF NOT EXISTS sms_history (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message text NOT NULL,
  recipient_count int DEFAULT 0,
  delivered_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  status varchar DEFAULT 'sent',
  cost numeric(10,4) DEFAULT 0,
  currency varchar DEFAULT 'KES',
  is_test boolean DEFAULT false,
  scheduled_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_history_tenant ON sms_history(tenant_id);
ALTER TABLE sms_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_history_tenant" ON sms_history FOR ALL USING (tenant_id = get_my_tenant_id());

-- SMS templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  category_id varchar REFERENCES email_categories(id) ON DELETE SET NULL,
  body text NOT NULL,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant ON sms_templates(tenant_id);
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_templates_tenant" ON sms_templates FOR ALL USING (tenant_id = get_my_tenant_id());
