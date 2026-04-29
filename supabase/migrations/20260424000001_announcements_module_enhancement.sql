-- ============================================================
-- Announcements Module Enhancement Migration
-- ============================================================

-- 1. Create announcement_types table
CREATE TABLE IF NOT EXISTS announcement_types (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id    VARCHAR NOT NULL,
  label        TEXT NOT NULL,
  description  TEXT,
  color        VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  icon         VARCHAR NOT NULL DEFAULT 'megaphone',
  is_default   BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  "order"      INTEGER NOT NULL DEFAULT 0,
  usage_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcement_types_tenant_id ON announcement_types(tenant_id);
ALTER TABLE announcement_types ENABLE ROW LEVEL SECURITY;
-- RLS policies for announcement_types
CREATE POLICY "announcement_types_select" ON announcement_types
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
    OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_types_insert" ON announcement_types
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_types_update" ON announcement_types
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_types_delete" ON announcement_types
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
-- 2. Extend announcements table
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS category_id       VARCHAR REFERENCES announcement_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience          VARCHAR NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS group_id          VARCHAR REFERENCES groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comments_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reactions_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rich_body         TEXT;
-- Add audience check constraint
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_audience_check;
ALTER TABLE announcements ADD CONSTRAINT announcements_audience_check
  CHECK (audience IN ('all', 'specific_group', 'leaders_only'));
-- Update status constraint to include scheduled and archived
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_status_check;
ALTER TABLE announcements ADD CONSTRAINT announcements_status_check
  CHECK (status IN ('active', 'scheduled', 'archived', 'draft'));
-- 3. Create announcement_attachments table
CREATE TABLE IF NOT EXISTS announcement_attachments (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       VARCHAR NOT NULL,
  announcement_id VARCHAR NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  type            VARCHAR NOT NULL CHECK (type IN ('image', 'video', 'pdf', 'file', 'link')),
  url             TEXT NOT NULL,
  filename        TEXT,
  size_bytes      BIGINT,
  mime_type       VARCHAR,
  og_title        TEXT,
  og_description  TEXT,
  og_image_url    TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_tenant_id ON announcement_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id ON announcement_attachments(announcement_id);
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcement_attachments_select" ON announcement_attachments
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
    OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_attachments_insert" ON announcement_attachments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_attachments_update" ON announcement_attachments
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_attachments_delete" ON announcement_attachments
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
-- 4. Create announcement_reactions table
CREATE TABLE IF NOT EXISTS announcement_reactions (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       VARCHAR NOT NULL,
  announcement_id VARCHAR NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  member_id       VARCHAR NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  emoji           VARCHAR NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, member_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_announcement_reactions_tenant_id ON announcement_reactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reactions_announcement_member ON announcement_reactions(announcement_id, member_id);
ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcement_reactions_select" ON announcement_reactions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
    OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_reactions_insert" ON announcement_reactions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_reactions_update" ON announcement_reactions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_reactions_delete" ON announcement_reactions
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
-- 5. Create announcement_comments table
CREATE TABLE IF NOT EXISTS announcement_comments (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       VARCHAR NOT NULL,
  announcement_id VARCHAR NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  member_id       VARCHAR NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  parent_id       VARCHAR REFERENCES announcement_comments(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_tenant_id ON announcement_comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_id ON announcement_comments(announcement_id);
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcement_comments_select" ON announcement_comments
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
    OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_comments_insert" ON announcement_comments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_comments_update" ON announcement_comments
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_comments_delete" ON announcement_comments
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
-- 6. Create announcement_read_receipts table
CREATE TABLE IF NOT EXISTS announcement_read_receipts (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       VARCHAR NOT NULL,
  announcement_id VARCHAR NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  member_id       VARCHAR NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_announcement_read_receipts_tenant_id ON announcement_read_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcement_read_receipts_announcement_member ON announcement_read_receipts(announcement_id, member_id);
ALTER TABLE announcement_read_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcement_read_receipts_select" ON announcement_read_receipts
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1)
    OR tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_read_receipts_insert" ON announcement_read_receipts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_read_receipts_update" ON announcement_read_receipts
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
CREATE POLICY "announcement_read_receipts_delete" ON announcement_read_receipts
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM members WHERE id = auth.uid()::text LIMIT 1));
-- 7. RPC function for incrementing usage count
CREATE OR REPLACE FUNCTION increment_announcement_type_usage(p_type_id VARCHAR)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE announcement_types
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = p_type_id;
$$;
