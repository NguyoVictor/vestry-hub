-- Fix RLS policies for Bible Explorer tables
-- The issue is that INSERT policies need WITH CHECK clauses to validate the data being inserted

-- Drop existing INSERT policies and recreate with proper WITH CHECK clauses
DROP POLICY IF EXISTS "Members can insert their own bookmarks" ON verse_bookmarks;
DROP POLICY IF EXISTS "Members can insert their own highlights" ON verse_highlights;
DROP POLICY IF EXISTS "Members can insert their own reactions" ON verse_reactions;
DROP POLICY IF EXISTS "Members can insert their own progress" ON reading_progress;
DROP POLICY IF EXISTS "Members can insert their own notes" ON verse_notes;
-- Recreate INSERT policies with proper WITH CHECK clauses
CREATE POLICY "Members can insert their own bookmarks" ON verse_bookmarks
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_bookmarks.tenant_id
        AND members.id = verse_bookmarks.member_id
    )
  );
CREATE POLICY "Members can insert their own highlights" ON verse_highlights
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_highlights.tenant_id
        AND members.id = verse_highlights.member_id
    )
  );
CREATE POLICY "Members can insert their own reactions" ON verse_reactions
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_reactions.tenant_id
        AND members.id = verse_reactions.member_id
    )
  );
CREATE POLICY "Members can insert their own progress" ON reading_progress
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = reading_progress.tenant_id
        AND members.id = reading_progress.member_id
    )
  );
CREATE POLICY "Members can insert their own notes" ON verse_notes
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_notes.tenant_id
        AND members.id = verse_notes.member_id
    )
  );
