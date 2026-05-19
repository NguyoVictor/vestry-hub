ALTER TABLE follow_up_tasks ADD COLUMN IF NOT EXISTS related_convert_id VARCHAR REFERENCES new_converts(id) ON DELETE SET NULL;
