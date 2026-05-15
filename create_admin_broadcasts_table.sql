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