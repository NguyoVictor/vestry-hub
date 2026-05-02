-- Quick fix: Add city column to members table
-- Run this directly in Supabase SQL Editor

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS city VARCHAR;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'members' 
AND column_name = 'city';
