-- WhatsApp columns on tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_connected boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_business_account_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_access_token text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_provider text DEFAULT 'auto-detect';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_display_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_description text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_category text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_website text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_profile_picture text;

-- WhatsApp messages log
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_member_id varchar REFERENCES members(id) ON DELETE SET NULL,
  recipient_phone varchar NOT NULL,
  template_name varchar NOT NULL,
  template_variables jsonb DEFAULT '{}'::jsonb,
  status varchar DEFAULT 'sent',
  message_id varchar,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_status ON whatsapp_messages(tenant_id, status);
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_messages_tenant" ON whatsapp_messages FOR ALL USING (tenant_id = get_my_tenant_id());

-- WhatsApp templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  category varchar DEFAULT 'UTILITY',
  description text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_approved boolean DEFAULT true,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_templates_tenant ON whatsapp_templates(tenant_id);
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_templates_tenant" ON whatsapp_templates FOR ALL USING (tenant_id = get_my_tenant_id());

-- WhatsApp automations
CREATE TABLE IF NOT EXISTS whatsapp_automations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_name varchar NOT NULL,
  template_name varchar,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, trigger_name)
);
CREATE INDEX IF NOT EXISTS idx_wa_automations_tenant ON whatsapp_automations(tenant_id);
ALTER TABLE whatsapp_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_automations_tenant" ON whatsapp_automations FOR ALL USING (tenant_id = get_my_tenant_id());

-- WhatsApp credits
CREATE TABLE IF NOT EXISTS whatsapp_credits (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  total_credits int DEFAULT 20,
  used_credits int DEFAULT 0,
  free_trial_credits int DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE whatsapp_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_credits_tenant" ON whatsapp_credits FOR ALL USING (tenant_id = get_my_tenant_id());

-- WhatsApp credit transactions
CREATE TABLE IF NOT EXISTS whatsapp_credit_transactions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  description varchar NOT NULL,
  credits_change int NOT NULL,
  balance_after int NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_credit_tx_tenant ON whatsapp_credit_transactions(tenant_id);
ALTER TABLE whatsapp_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_credit_tx_tenant" ON whatsapp_credit_transactions FOR ALL USING (tenant_id = get_my_tenant_id());
