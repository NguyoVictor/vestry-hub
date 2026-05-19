-- Fix giving_records member_id foreign key to reference members table instead of users table

-- First, drop the existing foreign key constraint
ALTER TABLE giving_records DROP CONSTRAINT IF EXISTS giving_records_member_id_fkey;
-- Add the correct foreign key constraint to reference members table
ALTER TABLE giving_records ADD CONSTRAINT giving_records_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;
-- Also ensure recorded_by references users table (this should be correct)
-- But let's make sure it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'giving_records_recorded_by_fkey'
  ) THEN
    ALTER TABLE giving_records ADD CONSTRAINT giving_records_recorded_by_fkey 
      FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
