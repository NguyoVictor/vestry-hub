-- Create admin_broadcasts table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject varchar NOT NULL,
  message text NOT NULL,
  priority varchar DEFAULT 'normal',
  channels text[] DEFAULT ARRAY['in_app'],
  recipient_type varchar DEFAULT 'all',
  recipient_ids text[],
  total_recipients int DEFAULT 0,
  status varchar DEFAULT 'draft',
  email_sent_count int DEFAULT 0,
  email_failed_count int DEFAULT 0,
  push_sent_count int DEFAULT 0,
  push_failed_count int DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by varchar REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_tenant ON admin_broadcasts(tenant_id);

-- Enable RLS
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DROP POLICY IF EXISTS "admin_broadcasts_tenant" ON admin_broadcasts;
CREATE POLICY "admin_broadcasts_tenant" ON admin_broadcasts FOR ALL USING (tenant_id = get_my_tenant_id());

-- Also create device_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS device_tokens (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_type varchar DEFAULT 'web',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_tenant ON device_tokens(tenant_id);

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DROP POLICY IF EXISTS "device_tokens_own" ON device_tokens;
CREATE POLICY "device_tokens_own" ON device_tokens FOR ALL USING (user_id = auth.uid()::text);