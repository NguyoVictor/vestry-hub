-- Add city column to members table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS city VARCHAR;
