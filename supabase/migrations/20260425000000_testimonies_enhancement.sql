-- ─── Testimony Categories ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimony_categories (
  id           VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id    VARCHAR NOT NULL,
  label        TEXT NOT NULL,
  color        VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_testimony_categories_tenant_id ON testimony_categories(tenant_id);
ALTER TABLE testimony_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimony_categories_select" ON testimony_categories FOR SELECT TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "testimony_categories_insert" ON testimony_categories FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "testimony_categories_update" ON testimony_categories FOR UPDATE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "testimony_categories_delete" ON testimony_categories FOR DELETE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1));
-- ─── Testimony Reactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimony_reactions (
  id              VARCHAR PRIMARY KEY DEFAULT nanoid(),
  tenant_id       VARCHAR NOT NULL,
  testimony_id    VARCHAR NOT NULL REFERENCES testimonies(id) ON DELETE CASCADE,
  member_id       VARCHAR NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reaction_type   VARCHAR NOT NULL CHECK (reaction_type IN ('amen', 'touched', 'inspiring')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (testimony_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_testimony_reactions_tenant_id ON testimony_reactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_testimony_reactions_testimony_id ON testimony_reactions(testimony_id);
ALTER TABLE testimony_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimony_reactions_select" ON testimony_reactions FOR SELECT TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "testimony_reactions_insert" ON testimony_reactions FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "testimony_reactions_delete" ON testimony_reactions FOR DELETE TO authenticated USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1));
-- ─── Extend testimonies table ─────────────────────────────────────────────────
ALTER TABLE testimonies
  ADD COLUMN IF NOT EXISTS category_id       VARCHAR REFERENCES testimony_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_of_testimony DATE,
  ADD COLUMN IF NOT EXISTS allow_featuring   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_by_member_id VARCHAR REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_by_admin_id  VARCHAR;
-- Ensure status column supports all required values
ALTER TABLE testimonies
  DROP CONSTRAINT IF EXISTS testimonies_status_check;
ALTER TABLE testimonies
  ADD CONSTRAINT testimonies_status_check
  CHECK (status IN ('pending', 'published', 'declined', 'retracted', 'approved'));
-- Add TABLES constant entry for testimony_categories and testimony_reactions
-- (handled in schema.ts);;
