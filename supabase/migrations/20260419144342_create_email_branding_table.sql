CREATE TABLE IF NOT EXISTS email_branding (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  sender_photo_url TEXT,
  sender_name TEXT,
  email_signature TEXT,
  primary_color TEXT NOT NULL DEFAULT '#4F46E5',
  button_color TEXT NOT NULL DEFAULT '#F97316',
  text_color TEXT NOT NULL DEFAULT '#1F2937',
  footer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_branding_tenant ON email_branding(tenant_id);
ALTER TABLE email_branding ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_branding' AND policyname='eb_tenant') THEN
    CREATE POLICY "eb_tenant" ON email_branding FOR ALL TO authenticated
      USING (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text)
      WITH CHECK (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text);
  END IF;
END $$;
CREATE OR REPLACE FUNCTION update_email_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'email_branding_updated_at') THEN
    CREATE TRIGGER email_branding_updated_at
      BEFORE UPDATE ON email_branding
      FOR EACH ROW EXECUTE FUNCTION update_email_branding_updated_at();
  END IF;
END $$;
