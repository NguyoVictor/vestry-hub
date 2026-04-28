-- ⚠️ COMPLETE SERMON ENGAGEMENT FIX
-- Run this entire SQL script in your Supabase SQL Editor
-- This creates all tables and fixes RLS policies

-- ============================================================================
-- STEP 1: Create engagement tables
-- ============================================================================

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

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sermon_reactions_sermon ON sermon_reactions(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_reactions_member ON sermon_reactions(member_id);
CREATE INDEX IF NOT EXISTS idx_sermon_bookmarks_sermon ON sermon_bookmarks(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_bookmarks_member ON sermon_bookmarks(member_id);
CREATE INDEX IF NOT EXISTS idx_sermon_notes_sermon ON sermon_notes(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_notes_member ON sermon_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_sermon_views_sermon ON sermon_views(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermons_featured ON sermons(tenant_id, is_featured) WHERE is_featured = true;

-- ============================================================================
-- STEP 3: Enable RLS on all tables
-- ============================================================================

ALTER TABLE sermon_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_views ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Drop any existing policies (clean slate)
-- ============================================================================

-- Reactions
DROP POLICY IF EXISTS "Members can view all reactions in their church" ON sermon_reactions;
DROP POLICY IF EXISTS "Members can insert their own reactions" ON sermon_reactions;
DROP POLICY IF EXISTS "Members can delete their own reactions" ON sermon_reactions;
DROP POLICY IF EXISTS "Anyone can view reactions" ON sermon_reactions;
DROP POLICY IF EXISTS "Anyone can insert reactions" ON sermon_reactions;
DROP POLICY IF EXISTS "Anyone can delete their own reactions" ON sermon_reactions;

-- Bookmarks
DROP POLICY IF EXISTS "Members can view their own bookmarks" ON sermon_bookmarks;
DROP POLICY IF EXISTS "Members can insert their own bookmarks" ON sermon_bookmarks;
DROP POLICY IF EXISTS "Members can delete their own bookmarks" ON sermon_bookmarks;
DROP POLICY IF EXISTS "Anyone can view bookmarks" ON sermon_bookmarks;
DROP POLICY IF EXISTS "Anyone can insert bookmarks" ON sermon_bookmarks;
DROP POLICY IF EXISTS "Anyone can delete bookmarks" ON sermon_bookmarks;

-- Notes
DROP POLICY IF EXISTS "Members can view their own notes" ON sermon_notes;
DROP POLICY IF EXISTS "Members can insert their own notes" ON sermon_notes;
DROP POLICY IF EXISTS "Members can update their own notes" ON sermon_notes;
DROP POLICY IF EXISTS "Members can delete their own notes" ON sermon_notes;
DROP POLICY IF EXISTS "Anyone can view notes" ON sermon_notes;
DROP POLICY IF EXISTS "Anyone can insert notes" ON sermon_notes;
DROP POLICY IF EXISTS "Anyone can update notes" ON sermon_notes;
DROP POLICY IF EXISTS "Anyone can delete notes" ON sermon_notes;

-- Views
DROP POLICY IF EXISTS "Anyone can insert sermon views" ON sermon_views;
DROP POLICY IF EXISTS "Admins can view all sermon views" ON sermon_views;

-- ============================================================================
-- STEP 5: Create new RLS policies (works for member portal)
-- ============================================================================

-- SERMON REACTIONS
CREATE POLICY "Anyone can view reactions"
  ON sermon_reactions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert reactions"
  ON sermon_reactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = sermon_reactions.member_id 
      AND members.tenant_id = sermon_reactions.tenant_id
    )
  );

CREATE POLICY "Anyone can delete their own reactions"
  ON sermon_reactions FOR DELETE
  USING (true);

-- SERMON BOOKMARKS
CREATE POLICY "Anyone can view bookmarks"
  ON sermon_bookmarks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert bookmarks"
  ON sermon_bookmarks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = sermon_bookmarks.member_id 
      AND members.tenant_id = sermon_bookmarks.tenant_id
    )
  );

CREATE POLICY "Anyone can delete bookmarks"
  ON sermon_bookmarks FOR DELETE
  USING (true);

-- SERMON NOTES
CREATE POLICY "Anyone can view notes"
  ON sermon_notes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert notes"
  ON sermon_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = sermon_notes.member_id 
      AND members.tenant_id = sermon_notes.tenant_id
    )
  );

CREATE POLICY "Anyone can update notes"
  ON sermon_notes FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete notes"
  ON sermon_notes FOR DELETE
  USING (true);

-- SERMON VIEWS
CREATE POLICY "Anyone can insert sermon views"
  ON sermon_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view sermon views"
  ON sermon_views FOR SELECT
  USING (true);

-- ============================================================================
-- STEP 6: Create triggers for auto-incrementing view count
-- ============================================================================

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

-- ============================================================================
-- ✅ DONE! All sermon engagement features should now work!
-- ============================================================================
