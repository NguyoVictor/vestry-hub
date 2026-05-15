-- Add missing columns to services table
-- Run this SQL directly in Supabase Dashboard > SQL Editor

-- Add allow_attendance column that the Services page expects
ALTER TABLE services 
  ADD COLUMN IF NOT EXISTS allow_attendance BOOLEAN DEFAULT true;

-- Update existing services to allow attendance by default
UPDATE services 
SET allow_attendance = true 
WHERE allow_attendance IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'services' 
  AND table_schema = 'public'
  AND column_name = 'allow_attendance';