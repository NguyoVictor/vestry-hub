-- ─── Church Media Enhancement Migration ──────────────────────────────────────
-- Adds: storage_plans, church_storage, media_albums, media_categories
-- Enhances: church_media_items with new columns
-- Adds: storage tracking triggers and get_storage_stats function
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. storage_plans ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS storage_plans (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  storage_limit BIGINT NOT NULL,
  price_usd   NUMERIC(10,2) NOT NULL,
  description TEXT,
  features    JSONB,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- Seed storage plans (only if empty)
INSERT INTO storage_plans (name, storage_limit, price_usd, description, features, sort_order)
SELECT * FROM (VALUES
  ('Free',    209715200::bigint,    0.00::numeric, 'Perfect for getting started — try Church Media risk-free',
   '["200 MB storage","Images, audio & video","Basic media gallery","Community support"]'::jsonb, 1),
  ('Starter', 1073741824::bigint,   5.00::numeric, 'For growing congregations uploading regularly',
   '["1 GB storage","Everything in Free","Albums & collections","Priority support"]'::jsonb, 2),
  ('Pro',     5368709120::bigint,  15.00::numeric, 'For active media ministries',
   '["5 GB storage","Everything in Starter","Advanced search","Bulk upload","Storage analytics"]'::jsonb, 3),
  ('Growth',  21474836480::bigint, 35.00::numeric, 'For large churches with high media volume',
   '["20 GB storage","Everything in Pro","Dedicated support","Custom categories"]'::jsonb, 4)
) AS v(name, storage_limit, price_usd, description, features, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM storage_plans LIMIT 1);
-- ─── 2. church_storage ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS church_storage (
  id                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id                   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_plan_id             TEXT NOT NULL REFERENCES storage_plans(id),
  storage_used_bytes          BIGINT NOT NULL DEFAULT 0,
  plan_activated_at           TIMESTAMPTZ DEFAULT now(),
  plan_expires_at             TIMESTAMPTZ,
  upgrade_requested_at        TIMESTAMPTZ,
  upgrade_requested_plan_id   TEXT REFERENCES storage_plans(id),
  storage_warning_sent_at     TIMESTAMPTZ,
  storage_full_notified_at    TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_church_storage_tenant_id ON church_storage(tenant_id);
-- RLS
ALTER TABLE church_storage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_storage_select" ON church_storage FOR SELECT TO authenticated
  USING (tenant_id = (SELECT id FROM tenants WHERE id = tenant_id LIMIT 1));
CREATE POLICY "church_storage_update" ON church_storage FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT id FROM tenants WHERE id = tenant_id LIMIT 1));
CREATE POLICY "church_storage_insert" ON church_storage FOR INSERT TO authenticated
  WITH CHECK (true);
-- Auto-initialize church_storage for existing tenants that don't have a row
INSERT INTO church_storage (tenant_id, storage_plan_id)
SELECT t.id, (SELECT id FROM storage_plans WHERE name = 'Free' LIMIT 1)
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM church_storage cs WHERE cs.tenant_id = t.id)
ON CONFLICT (tenant_id) DO NOTHING;
-- ─── 3. media_categories ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_categories (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_categories_tenant_id ON media_categories(tenant_id);
ALTER TABLE media_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_categories_all" ON media_categories FOR ALL TO authenticated
  USING (tenant_id = (SELECT id FROM tenants WHERE id = tenant_id LIMIT 1))
  WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE id = tenant_id LIMIT 1));
-- Seed default categories for existing tenants that have none
INSERT INTO media_categories (tenant_id, name, color, description, sort_order)
SELECT t.id, v.name, v.color, v.description, v.sort_order
FROM tenants t
CROSS JOIN (VALUES
  ('General',   '#6366f1', 'General church media',              0),
  ('Worship',   '#7c3aed', 'Worship service photos and videos', 1),
  ('Events',    '#f59e0b', 'Church events and programs',        2),
  ('Youth',     '#10b981', 'Youth ministry media',              3),
  ('Sermons',   '#3b82f6', 'Sermon recordings and graphics',    4),
  ('Community', '#ec4899', 'Community and outreach media',      5)
) AS v(name, color, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM media_categories mc WHERE mc.tenant_id = t.id);
-- ─── 4. media_albums ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_albums (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  cover_media_id  TEXT,
  visibility      TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('members','leaders','admin')),
  sort_order      INTEGER DEFAULT 0,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_albums_tenant_id ON media_albums(tenant_id);
ALTER TABLE media_albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_albums_all" ON media_albums FOR ALL TO authenticated
  USING (tenant_id = (SELECT id FROM tenants WHERE id = tenant_id LIMIT 1))
  WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE id = tenant_id LIMIT 1));
-- ─── 5. Enhance church_media_items ───────────────────────────────────────────
ALTER TABLE church_media_items
  ADD COLUMN IF NOT EXISTS album_id        TEXT REFERENCES media_albums(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id     TEXT REFERENCES media_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility      TEXT NOT NULL DEFAULT 'members',
  ADD COLUMN IF NOT EXISTS is_featured     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS download_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS view_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration        INTEGER,
  ADD COLUMN IF NOT EXISTS thumbnail_url   TEXT;
-- Add visibility check constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'church_media_items_visibility_check'
  ) THEN
    ALTER TABLE church_media_items
      ADD CONSTRAINT church_media_items_visibility_check
      CHECK (visibility IN ('members','leaders','admin','featured'));
  END IF;
END $$;
-- ─── 6. Storage tracking triggers ────────────────────────────────────────────

-- Function: update storage on insert
CREATE OR REPLACE FUNCTION update_storage_on_media_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Ensure church_storage row exists
  INSERT INTO church_storage (tenant_id, storage_plan_id)
  VALUES (NEW.tenant_id, (SELECT id FROM storage_plans WHERE name = 'Free' LIMIT 1))
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Update storage used
  UPDATE church_storage
  SET storage_used_bytes = storage_used_bytes + COALESCE(NEW.file_size, 0),
      updated_at = now()
  WHERE tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$$;
-- Function: update storage on delete
CREATE OR REPLACE FUNCTION update_storage_on_media_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE church_storage
  SET storage_used_bytes = GREATEST(0, storage_used_bytes - COALESCE(OLD.file_size, 0)),
      updated_at = now()
  WHERE tenant_id = OLD.tenant_id;

  RETURN OLD;
END;
$$;
-- Drop and recreate triggers
DROP TRIGGER IF EXISTS trg_update_storage_on_insert ON church_media_items;
CREATE TRIGGER trg_update_storage_on_insert
  AFTER INSERT ON church_media_items
  FOR EACH ROW EXECUTE FUNCTION update_storage_on_media_insert();
DROP TRIGGER IF EXISTS trg_update_storage_on_delete ON church_media_items;
CREATE TRIGGER trg_update_storage_on_delete
  AFTER DELETE ON church_media_items
  FOR EACH ROW EXECUTE FUNCTION update_storage_on_media_delete();
-- ─── 7. get_storage_stats function ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_storage_stats(p_tenant_id TEXT)
RETURNS TABLE (
  used_bytes      BIGINT,
  limit_bytes     BIGINT,
  percentage      NUMERIC,
  plan_name       TEXT,
  plan_price      NUMERIC,
  is_over_limit   BOOLEAN,
  is_near_limit   BOOLEAN,
  upgrade_pending BOOLEAN
) LANGUAGE plpgsql AS $$
DECLARE
  v_used    BIGINT;
  v_limit   BIGINT;
  v_pct     NUMERIC;
  v_plan    TEXT;
  v_price   NUMERIC;
  v_pending BOOLEAN;
BEGIN
  SELECT
    cs.storage_used_bytes,
    sp.storage_limit,
    sp.name,
    sp.price_usd,
    (cs.upgrade_requested_at IS NOT NULL)
  INTO v_used, v_limit, v_plan, v_price, v_pending
  FROM church_storage cs
  JOIN storage_plans sp ON sp.id = cs.storage_plan_id
  WHERE cs.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    v_used := 0;
    v_limit := 209715200; -- 200 MB free
    v_plan := 'Free';
    v_price := 0;
    v_pending := false;
  END IF;

  v_pct := CASE WHEN v_limit > 0 THEN ROUND((v_used::NUMERIC / v_limit::NUMERIC) * 100, 2) ELSE 0 END;

  RETURN QUERY SELECT
    v_used,
    v_limit,
    v_pct,
    v_plan,
    v_price,
    (v_pct >= 100),
    (v_pct >= 80),
    v_pending;
END;
$$;
-- ─── 8. Add is_super_admin to users ──────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;
-- NOTE: Run this after deployment to grant super-admin access:
-- UPDATE users SET is_super_admin = true WHERE email = 'your-email@example.com';;;
