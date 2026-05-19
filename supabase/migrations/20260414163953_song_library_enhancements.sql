-- Add video_url and chord_sheet_path to songs table
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS chord_sheet_path text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
-- Add index on tenant_id for songs (if not exists)
CREATE INDEX IF NOT EXISTS idx_songs_tenant_id ON songs(tenant_id);
-- Add index on tenant_id for set_lists (if not exists)
CREATE INDEX IF NOT EXISTS idx_set_lists_tenant_id ON set_lists(tenant_id);
-- Add index on set_list_id for set_list_songs (if not exists)
CREATE INDEX IF NOT EXISTS idx_set_list_songs_set_list_id ON set_list_songs(set_list_id);
-- Ensure RLS policies exist for songs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'songs' AND policyname = 'songs_tenant_isolation'
  ) THEN
    CREATE POLICY songs_tenant_isolation ON songs
      USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
  END IF;
END $$;
-- Ensure RLS policies exist for set_lists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'set_lists' AND policyname = 'set_lists_tenant_isolation'
  ) THEN
    CREATE POLICY set_lists_tenant_isolation ON set_lists
      USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
  END IF;
END $$;
-- Ensure RLS policies exist for set_list_songs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'set_list_songs' AND policyname = 'set_list_songs_tenant_isolation'
  ) THEN
    CREATE POLICY set_list_songs_tenant_isolation ON set_list_songs
      USING (
        set_list_id IN (
          SELECT id FROM set_lists
          WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text)
        )
      );
  END IF;
END $$;
-- Create storage bucket for chord sheets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chord-sheets', 'chord-sheets', false)
ON CONFLICT (id) DO NOTHING;
