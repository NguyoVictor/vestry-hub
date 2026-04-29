-- ─── Children's Ministry Tables ──────────────────────────────────────────────

-- Children classes (Nursery, Primary, Junior Church, etc.)
CREATE TABLE IF NOT EXISTS children_classes (
  id            VARCHAR PRIMARY KEY DEFAULT 'cls_' || substr(md5(random()::text), 1, 12),
  tenant_id     VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR NOT NULL,
  min_age       INTEGER NOT NULL DEFAULT 0,
  max_age       INTEGER NOT NULL DEFAULT 12,
  teacher_id    VARCHAR REFERENCES members(id) ON DELETE SET NULL,
  capacity      INTEGER,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_children_classes_tenant ON children_classes(tenant_id);
-- Children records
CREATE TABLE IF NOT EXISTS children (
  id                     VARCHAR PRIMARY KEY DEFAULT 'chd_' || substr(md5(random()::text), 1, 12),
  tenant_id              VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id              VARCHAR REFERENCES families(id) ON DELETE SET NULL,
  first_name             VARCHAR NOT NULL,
  last_name              VARCHAR NOT NULL,
  date_of_birth          DATE NOT NULL,
  gender                 VARCHAR CHECK (gender IN ('male','female','prefer_not_to_say')),
  class_id               VARCHAR REFERENCES children_classes(id) ON DELETE SET NULL,
  guardian_primary_id    VARCHAR REFERENCES members(id) ON DELETE SET NULL,
  guardian_secondary_id  VARCHAR REFERENCES members(id) ON DELETE SET NULL,
  photo_url              TEXT,
  special_needs_notes    TEXT,
  active                 BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_children_tenant    ON children(tenant_id);
CREATE INDEX IF NOT EXISTS idx_children_class     ON children(class_id);
CREATE INDEX IF NOT EXISTS idx_children_guardian  ON children(guardian_primary_id);
-- Check-in / check-out records
CREATE TABLE IF NOT EXISTS children_checkins (
  id                VARCHAR PRIMARY KEY DEFAULT 'cin_' || substr(md5(random()::text), 1, 12),
  tenant_id         VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  child_id          VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  service_id        VARCHAR REFERENCES services(id) ON DELETE SET NULL,
  checked_in_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_by     VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  checked_out_at    TIMESTAMPTZ,
  checked_out_by    VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  check_in_method   VARCHAR NOT NULL DEFAULT 'manual' CHECK (check_in_method IN ('qr','manual')),
  qr_code_data      TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkins_tenant    ON children_checkins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checkins_child     ON children_checkins(child_id);
CREATE INDEX IF NOT EXISTS idx_checkins_service   ON children_checkins(service_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date      ON children_checkins(checked_in_at);
-- QR codes for child check-in
CREATE TABLE IF NOT EXISTS children_qr_codes (
  id          VARCHAR PRIMARY KEY DEFAULT 'qrc_' || substr(md5(random()::text), 1, 12),
  tenant_id   VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  child_id    VARCHAR NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  service_id  VARCHAR REFERENCES services(id) ON DELETE SET NULL,
  qr_data     VARCHAR NOT NULL UNIQUE,
  sent_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_codes_tenant  ON children_qr_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_child   ON children_qr_codes(child_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_data ON children_qr_codes(qr_data);
-- Children's Ministry settings per tenant
CREATE TABLE IF NOT EXISTS children_ministry_settings (
  id                          VARCHAR PRIMARY KEY DEFAULT 'cms_' || substr(md5(random()::text), 1, 12),
  tenant_id                   VARCHAR NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  kiosk_pin                   VARCHAR NOT NULL DEFAULT '1234',
  kiosk_idle_timeout_minutes  INTEGER NOT NULL DEFAULT 1,
  kiosk_auto_return_seconds   INTEGER NOT NULL DEFAULT 3,
  auto_send_qr_on_confirm     BOOLEAN NOT NULL DEFAULT true,
  send_qr_reminder            BOOLEAN NOT NULL DEFAULT true,
  qr_reminder_days_before     INTEGER NOT NULL DEFAULT 1,
  notify_checkin              BOOLEAN NOT NULL DEFAULT true,
  notify_checkout             BOOLEAN NOT NULL DEFAULT true,
  email_qr_to_parents         BOOLEAN NOT NULL DEFAULT false,
  auto_assign_class_by_age    BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cm_settings_tenant ON children_ministry_settings(tenant_id);
-- Enable RLS on all tables
ALTER TABLE children_classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE children                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_checkins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_qr_codes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_ministry_settings    ENABLE ROW LEVEL SECURITY;
-- RLS policies (authenticated users can access their own tenant's data)
CREATE POLICY "tenant_isolation_children_classes" ON children_classes
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "tenant_isolation_children" ON children
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "tenant_isolation_children_checkins" ON children_checkins
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "tenant_isolation_children_qr_codes" ON children_qr_codes
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "tenant_isolation_cm_settings" ON children_ministry_settings
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
-- Seed default classes for existing tenants (runs once)
-- New tenants get seeded on first visit via the app;
