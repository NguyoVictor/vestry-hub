-- Fix Bible Explorer RLS policies for member portal authentication
-- Member portal uses localStorage session, not Supabase Auth
-- Follow the same pattern as giving_records and members tables

-- Drop all existing policies for Bible Explorer tables
DROP POLICY IF EXISTS "Members can insert their own bookmarks" ON verse_bookmarks;
DROP POLICY IF EXISTS "Members can update their own bookmarks" ON verse_bookmarks;
DROP POLICY IF EXISTS "Members can delete their own bookmarks" ON verse_bookmarks;
DROP POLICY IF EXISTS "Members can view their own bookmarks" ON verse_bookmarks;
DROP POLICY IF EXISTS "Members can insert their own highlights" ON verse_highlights;
DROP POLICY IF EXISTS "Members can update their own highlights" ON verse_highlights;
DROP POLICY IF EXISTS "Members can delete their own highlights" ON verse_highlights;
DROP POLICY IF EXISTS "Members can view their own highlights" ON verse_highlights;
DROP POLICY IF EXISTS "Members can insert their own reactions" ON verse_reactions;
DROP POLICY IF EXISTS "Members can update their own reactions" ON verse_reactions;
DROP POLICY IF EXISTS "Members can delete their own reactions" ON verse_reactions;
DROP POLICY IF EXISTS "Members can view all reactions in their tenant" ON verse_reactions;
DROP POLICY IF EXISTS "Members can insert their own progress" ON reading_progress;
DROP POLICY IF EXISTS "Members can update their own progress" ON reading_progress;
DROP POLICY IF EXISTS "Members can view their own progress" ON reading_progress;
DROP POLICY IF EXISTS "Members can insert their own notes" ON verse_notes;
DROP POLICY IF EXISTS "Members can update their own notes" ON verse_notes;
DROP POLICY IF EXISTS "Members can delete their own notes" ON verse_notes;
DROP POLICY IF EXISTS "Members can view their own notes" ON verse_notes;
-- Create simple public policies like other member portal features
-- The application handles security via localStorage session validation

-- Verse Bookmarks
CREATE POLICY "verse_bookmarks_public_access" ON verse_bookmarks
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
-- Verse Highlights  
CREATE POLICY "verse_highlights_public_access" ON verse_highlights
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
-- Verse Reactions
CREATE POLICY "verse_reactions_public_access" ON verse_reactions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
-- Reading Progress
CREATE POLICY "reading_progress_public_access" ON reading_progress
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
-- Verse Notes
CREATE POLICY "verse_notes_public_access" ON verse_notes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
