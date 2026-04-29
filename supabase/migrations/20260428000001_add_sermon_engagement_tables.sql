-- Create tables for sermon engagement features

-- Sermon reactions (prayer, heart, fire)
CREATE TABLE IF NOT EXISTS sermon_reactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sermon_id VARCHAR NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  member_id VARCHAR NOT NULL,
  reaction_type VARCHAR NOT NULL CHECK (reaction_type IN ('prayer', 'heart', 'fire')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sermon_id, member_id, reaction_type)
);
-- Sermon bookmarks
CREATE TABLE IF NOT EXISTS sermon_bookmarks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sermon_id VARCHAR NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  member_id VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sermon_id, member_id)
);
-- Sermon personal notes
CREATE TABLE IF NOT EXISTS sermon_notes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sermon_id VARCHAR NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  member_id VARCHAR NOT NULL,
  notes_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sermon_id, member_id)
);
-- Sermon views tracking
CREATE TABLE IF NOT EXISTS sermon_views (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sermon_id VARCHAR NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  member_id VARCHAR,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add featured sermon column to sermons table
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
-- Add view count column (denormalized for performance)
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sermon_reactions_sermon ON sermon_reactions(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_reactions_member ON sermon_reactions(member_id);
CREATE INDEX IF NOT EXISTS idx_sermon_bookmarks_sermon ON sermon_bookmarks(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_bookmarks_member ON sermon_bookmarks(member_id);
CREATE INDEX IF NOT EXISTS idx_sermon_notes_sermon ON sermon_notes(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_notes_member ON sermon_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_sermon_views_sermon ON sermon_views(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermons_featured ON sermons(tenant_id, is_featured) WHERE is_featured = true;
-- RLS Policies

-- Sermon reactions
ALTER TABLE sermon_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view all reactions in their church"
  ON sermon_reactions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM members WHERE id = auth.uid()));
CREATE POLICY "Members can insert their own reactions"
  ON sermon_reactions FOR INSERT
  WITH CHECK (member_id = auth.uid());
CREATE POLICY "Members can delete their own reactions"
  ON sermon_reactions FOR DELETE
  USING (member_id = auth.uid());
-- Sermon bookmarks
ALTER TABLE sermon_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their own bookmarks"
  ON sermon_bookmarks FOR SELECT
  USING (member_id = auth.uid());
CREATE POLICY "Members can insert their own bookmarks"
  ON sermon_bookmarks FOR INSERT
  WITH CHECK (member_id = auth.uid());
CREATE POLICY "Members can delete their own bookmarks"
  ON sermon_bookmarks FOR DELETE
  USING (member_id = auth.uid());
-- Sermon notes
ALTER TABLE sermon_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their own notes"
  ON sermon_notes FOR SELECT
  USING (member_id = auth.uid());
CREATE POLICY "Members can insert their own notes"
  ON sermon_notes FOR INSERT
  WITH CHECK (member_id = auth.uid());
CREATE POLICY "Members can update their own notes"
  ON sermon_notes FOR UPDATE
  USING (member_id = auth.uid());
CREATE POLICY "Members can delete their own notes"
  ON sermon_notes FOR DELETE
  USING (member_id = auth.uid());
-- Sermon views
ALTER TABLE sermon_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert sermon views"
  ON sermon_views FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins can view all sermon views"
  ON sermon_views FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_sermon_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sermons
  SET view_count = view_count + 1
  WHERE id = NEW.sermon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger to auto-increment view count
DROP TRIGGER IF EXISTS trigger_increment_sermon_views ON sermon_views;
CREATE TRIGGER trigger_increment_sermon_views
  AFTER INSERT ON sermon_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_sermon_view_count();
-- Function to update sermon_notes updated_at
CREATE OR REPLACE FUNCTION update_sermon_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_sermon_notes_timestamp ON sermon_notes;
CREATE TRIGGER trigger_update_sermon_notes_timestamp
  BEFORE UPDATE ON sermon_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_sermon_notes_updated_at();
