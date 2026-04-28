-- Add missing columns to sermons table
-- Run this in Supabase SQL Editor

-- Add description column if it doesn't exist
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS description TEXT;

-- Add other potentially missing columns from the sermon drawer
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS author VARCHAR;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS closing_prayer TEXT;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS benediction TEXT;

-- Verify all columns now exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sermons'
AND column_name IN (
  'description', 
  'tags', 
  'author', 
  'closing_prayer', 
  'benediction',
  'thumbnail_url',
  'thumbnail_path',
  'video_url',
  'audio_url',
  'audio_file_path',
  'doc_file_path',
  'manuscript',
  'is_featured',
  'view_count'
)
ORDER BY column_name;
