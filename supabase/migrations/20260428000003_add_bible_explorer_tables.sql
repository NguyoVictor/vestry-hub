-- Bible Explorer UI Revamp — Member Side Tables
-- Creates five new tables for Bible engagement features

-- ══════════════════════════════════════════════════════════════════════════════
-- Table: verse_highlights
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS verse_highlights (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_verse_highlights_lookup ON verse_highlights (tenant_id, member_id, book_id, chapter);
-- ══════════════════════════════════════════════════════════════════════════════
-- Table: verse_bookmarks
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS verse_bookmarks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  verse_text TEXT NOT NULL,
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_verse_bookmarks_lookup ON verse_bookmarks (tenant_id, member_id);
-- ══════════════════════════════════════════════════════════════════════════════
-- Table: verse_reactions
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS verse_reactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, member_id, book_id, chapter, verse_number, reaction)
);
CREATE INDEX idx_verse_reactions_lookup ON verse_reactions (tenant_id, book_id, chapter);
-- ══════════════════════════════════════════════════════════════════════════════
-- Table: reading_progress
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reading_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, member_id, book_id, chapter)
);
CREATE INDEX idx_reading_progress_lookup ON reading_progress (tenant_id, member_id);
-- ══════════════════════════════════════════════════════════════════════════════
-- Table: verse_notes
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS verse_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_verse_notes_lookup ON verse_notes (tenant_id, member_id, book_id, chapter);
-- ══════════════════════════════════════════════════════════════════════════════
-- Add bible_settings column to member_preferences
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE member_preferences 
  ADD COLUMN IF NOT EXISTS bible_settings JSONB DEFAULT '{}';
-- ══════════════════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all five new tables
ALTER TABLE verse_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE verse_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE verse_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE verse_notes ENABLE ROW LEVEL SECURITY;
-- verse_highlights policies
CREATE POLICY "Members can view their own highlights"
  ON verse_highlights FOR SELECT
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_highlights.tenant_id));
CREATE POLICY "Members can insert their own highlights"
  ON verse_highlights FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_highlights.tenant_id));
CREATE POLICY "Members can delete their own highlights"
  ON verse_highlights FOR DELETE
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_highlights.tenant_id AND id = verse_highlights.member_id));
-- verse_bookmarks policies
CREATE POLICY "Members can view their own bookmarks"
  ON verse_bookmarks FOR SELECT
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_bookmarks.tenant_id));
CREATE POLICY "Members can insert their own bookmarks"
  ON verse_bookmarks FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_bookmarks.tenant_id));
CREATE POLICY "Members can delete their own bookmarks"
  ON verse_bookmarks FOR DELETE
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_bookmarks.tenant_id AND id = verse_bookmarks.member_id));
-- verse_reactions policies (tenant-wide read, member-scoped write)
CREATE POLICY "Members can view all reactions in their tenant"
  ON verse_reactions FOR SELECT
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_reactions.tenant_id));
CREATE POLICY "Members can insert their own reactions"
  ON verse_reactions FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_reactions.tenant_id));
CREATE POLICY "Members can delete their own reactions"
  ON verse_reactions FOR DELETE
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_reactions.tenant_id AND id = verse_reactions.member_id));
-- reading_progress policies
CREATE POLICY "Members can view their own progress"
  ON reading_progress FOR SELECT
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = reading_progress.tenant_id));
CREATE POLICY "Members can insert their own progress"
  ON reading_progress FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM members WHERE tenant_id = reading_progress.tenant_id));
CREATE POLICY "Members can update their own progress"
  ON reading_progress FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = reading_progress.tenant_id AND id = reading_progress.member_id));
-- verse_notes policies
CREATE POLICY "Members can view their own notes"
  ON verse_notes FOR SELECT
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_notes.tenant_id AND id = verse_notes.member_id));
CREATE POLICY "Members can insert their own notes"
  ON verse_notes FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_notes.tenant_id));
CREATE POLICY "Members can update their own notes"
  ON verse_notes FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_notes.tenant_id AND id = verse_notes.member_id));
CREATE POLICY "Members can delete their own notes"
  ON verse_notes FOR DELETE
  USING (auth.uid() IN (SELECT id FROM members WHERE tenant_id = verse_notes.tenant_id AND id = verse_notes.member_id));
