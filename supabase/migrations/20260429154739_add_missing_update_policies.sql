-- Add missing UPDATE policies for Bible Explorer tables

-- Add UPDATE policy for verse_bookmarks (missing)
CREATE POLICY "Members can update their own bookmarks" ON verse_bookmarks
  FOR UPDATE
  TO public
  USING (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_bookmarks.tenant_id
        AND members.id = verse_bookmarks.member_id
    )
  )
  WITH CHECK (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_bookmarks.tenant_id
        AND members.id = verse_bookmarks.member_id
    )
  );
-- Add UPDATE policy for verse_highlights (missing)
CREATE POLICY "Members can update their own highlights" ON verse_highlights
  FOR UPDATE
  TO public
  USING (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_highlights.tenant_id
        AND members.id = verse_highlights.member_id
    )
  )
  WITH CHECK (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_highlights.tenant_id
        AND members.id = verse_highlights.member_id
    )
  );
-- Add UPDATE policy for verse_reactions (missing)
CREATE POLICY "Members can update their own reactions" ON verse_reactions
  FOR UPDATE
  TO public
  USING (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_reactions.tenant_id
        AND members.id = verse_reactions.member_id
    )
  )
  WITH CHECK (
    auth.uid()::text IN (
      SELECT members.id
      FROM members
      WHERE members.tenant_id = verse_reactions.tenant_id
        AND members.id = verse_reactions.member_id
    )
  );
