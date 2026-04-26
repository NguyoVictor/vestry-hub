-- appointment_types
CREATE TABLE IF NOT EXISTS appointment_types (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   VARCHAR NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointment_types_tenant_id ON appointment_types(tenant_id);
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apt_types_select" ON appointment_types FOR SELECT TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1) OR tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "apt_types_insert" ON appointment_types FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "apt_types_update" ON appointment_types FOR UPDATE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "apt_types_delete" ON appointment_types FOR DELETE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- appointments
CREATE TABLE IF NOT EXISTS appointments (
  id                  VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id           VARCHAR NOT NULL,
  member_id           VARCHAR NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  appointment_type_id VARCHAR REFERENCES appointment_types(id) ON DELETE SET NULL,
  mode                VARCHAR NOT NULL DEFAULT 'physical' CHECK (mode IN ('online','physical')),
  preferred_date      DATE NOT NULL,
  preferred_time      TIME NOT NULL,
  notes               TEXT,
  status              VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','rescheduled','cancelled','completed')),
  assigned_staff_id   VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  location            TEXT,
  physical_notes      TEXT,
  admin_notes         TEXT,
  jitsi_room_name     TEXT,
  rescheduled_date    DATE,
  rescheduled_time    TIME,
  decline_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_member_id ON appointments(member_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_preferred_date ON appointments(preferred_date);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_member_select" ON appointments FOR SELECT TO authenticated USING (member_id = auth.uid()::text OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "appointments_member_insert" ON appointments FOR INSERT TO authenticated WITH CHECK (member_id = auth.uid()::text OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "appointments_member_update" ON appointments FOR UPDATE TO authenticated USING (member_id = auth.uid()::text OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "appointments_admin_delete" ON appointments FOR DELETE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));

-- Seed default appointment types
INSERT INTO appointment_types (tenant_id, label, description, is_active, is_default, sort_order)
SELECT t.id, v.label, v.description, true, true, v.sort_order
FROM tenants t
CROSS JOIN (VALUES
  ('Counselling Session',      'One-on-one pastoral counselling',           0),
  ('Prayer Session',           'Personal prayer with a church leader',      1),
  ('Pastoral Visit',           'Home or hospital visit by a pastor',        2),
  ('Marriage Preparation',     'Pre-marital counselling sessions',          3),
  ('Membership Consultation',  'Discuss church membership and next steps',  4),
  ('General Meeting',          'General meeting with church leadership',    5)
) AS v(label, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM appointment_types at2 WHERE at2.tenant_id = t.id);
