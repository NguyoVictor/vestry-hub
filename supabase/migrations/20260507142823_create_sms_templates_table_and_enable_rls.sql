-- Create SMS Templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id VARCHAR PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all SMS tables
ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for SMS tables
CREATE POLICY "Users can manage their tenant's SMS settings" ON sms_settings
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can view their tenant's SMS history" ON sms_history
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can manage their tenant's SMS templates" ON sms_templates
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant_id ON sms_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_settings_tenant_id ON sms_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_history_tenant_id ON sms_history(tenant_id);;
