-- Members no longer require a corresponding users row (member portal uses members table directly)
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_id_fkey;
