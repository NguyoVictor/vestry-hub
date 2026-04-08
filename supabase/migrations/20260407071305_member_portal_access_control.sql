CREATE OR REPLACE FUNCTION generate_church_code(church_name TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
  full_code TEXT;
  exists_count INT;
BEGIN
  prefix := UPPER(REGEXP_REPLACE(church_name, '[^a-zA-Z0-9]', '', 'g'));
  prefix := LEFT(prefix, 4);
  prefix := RPAD(prefix, 4, 'X');
  LOOP
    suffix := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    full_code := prefix || '-' || suffix;
    SELECT COUNT(*) INTO exists_count FROM tenants WHERE church_code = full_code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN full_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_church_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.church_code IS NULL OR NEW.church_code = '' THEN
    NEW.church_code := generate_church_code(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_church_code ON tenants;
CREATE TRIGGER auto_generate_church_code
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION set_church_code();

UPDATE tenants
SET church_code = generate_church_code(name)
WHERE church_code IS NULL OR church_code = '';

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS member_type TEXT DEFAULT 'member'
    CHECK (member_type IN ('member', 'visitor')),
  ADD COLUMN IF NOT EXISTS registration_source TEXT DEFAULT 'admin'
    CHECK (registration_source IN ('qr_scan', 'admin', 'invite_email', 'invite_sms')),
  ADD COLUMN IF NOT EXISTS portal_last_seen TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS member_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id VARCHAR NOT NULL,
  tenant_id VARCHAR NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE member_sessions ENABLE ROW LEVEL SECURITY;;
