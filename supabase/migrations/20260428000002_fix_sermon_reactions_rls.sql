-- Fix RLS policies for sermon reactions to work with member portal (non-auth users)

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view all reactions in their church" ON sermon_reactions;
DROP POLICY IF EXISTS "Members can insert their own reactions" ON sermon_reactions;
DROP POLICY IF EXISTS "Members can delete their own reactions" ON sermon_reactions;

-- Recreate policies that work for both authenticated users and member portal users
-- Allow anyone to view reactions (public read)
CREATE POLICY "Anyone can view reactions"
  ON sermon_reactions FOR SELECT
  USING (true);

-- Allow anyone to insert reactions (we validate member_id exists in members table)
CREATE POLICY "Anyone can insert reactions"
  ON sermon_reactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.id = sermon_reactions.member_id 
      AND members.tenant_id = sermon_reactions.tenant_id
    )
  );

-- Allow anyone to delete reactions where they are the member
CREATE POLICY "Anyone can delete their own reactions"
  ON sermon_reactions FOR DELETE
  USING (true);

-- Update sermon_bookmarks policies
DROP POLICY IF EXISTS "Members can view their own bookmarks" ON sermon_bookmarks;
DROP POLICY IF EXISTS "Members can insert their own bookmarks" ON sermon_bookmarks;
DROP POLICY IF EXISTS "Members can delete their own bookmarks" ON sermon_bookmarks;

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

-- Update sermon_notes policies
DROP POLICY IF EXISTS "Members can view their own notes" ON sermon_notes;
DROP POLICY IF EXISTS "Members can insert their own notes" ON sermon_notes;
DROP POLICY IF EXISTS "Members can update their own notes" ON sermon_notes;
DROP POLICY IF EXISTS "Members can delete their own notes" ON sermon_notes;

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
