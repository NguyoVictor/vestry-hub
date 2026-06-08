-- Create WhatsApp Directory tables for contacts and groups

-- WhatsApp Contacts table
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  title VARCHAR,
  phone VARCHAR NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Groups table
CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  invite_link TEXT,
  emoji VARCHAR DEFAULT '👥',
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for whatsapp_contacts
CREATE POLICY "whatsapp_contacts_tenant_access" ON whatsapp_contacts
  FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

-- Create RLS policies for whatsapp_groups  
CREATE POLICY "whatsapp_groups_tenant_access" ON whatsapp_groups
  FOR ALL USING (auth.role() IN ('authenticated', 'anon'));

-- Grant permissions
GRANT ALL ON whatsapp_contacts TO authenticated;
GRANT ALL ON whatsapp_contacts TO anon;
GRANT ALL ON whatsapp_groups TO authenticated;
GRANT ALL ON whatsapp_groups TO anon;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_id ON whatsapp_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_active ON whatsapp_contacts(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_tenant_id ON whatsapp_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_active ON whatsapp_groups(tenant_id, is_active) WHERE is_active = true;