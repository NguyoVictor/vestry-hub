-- Add group_type_id column to groups table
-- This column references the group_types table for better type management

ALTER TABLE groups 
  ADD COLUMN IF NOT EXISTS group_type_id TEXT REFERENCES group_types(id) ON DELETE SET NULL;
-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_groups_group_type_id ON groups(group_type_id);
-- Ensure all expected columns exist (some may have been added in different migrations)
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS cover_color TEXT,
  ADD COLUMN IF NOT EXISTS meeting_location TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'onsite' CHECK (meeting_type IN ('online','onsite','hybrid')),
  ADD COLUMN IF NOT EXISTS jitsi_room_name TEXT,
  ADD COLUMN IF NOT EXISTS max_members INTEGER,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public','private')),
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS meeting_day TEXT,
  ADD COLUMN IF NOT EXISTS meeting_time TEXT;
-- Update existing groups to use the new group_type_id system
-- This migration preserves existing data by mapping old 'type' enum values to new group_types
-- Note: This assumes group_types have been created for the tenant

-- Optional: You can add default group types here if needed
-- INSERT INTO group_types (tenant_id, label, color, description) 
-- SELECT DISTINCT tenant_id, 'General', '#6366f1', 'General purpose group'
-- FROM groups 
-- WHERE NOT EXISTS (SELECT 1 FROM group_types WHERE tenant_id = groups.tenant_id)
-- ON CONFLICT DO NOTHING;;
