-- Create broadcast_templates table
CREATE TABLE IF NOT EXISTS broadcast_templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  subject varchar NOT NULL,
  message text NOT NULL,
  priority varchar DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  channels text[] DEFAULT ARRAY['in_app'],
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_tenant_id ON broadcast_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_templates_is_system ON broadcast_templates(is_system);
-- Enable RLS
ALTER TABLE broadcast_templates ENABLE ROW LEVEL SECURITY;
-- Create RLS policy
CREATE POLICY "broadcast_templates_tenant_isolation" ON broadcast_templates
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
