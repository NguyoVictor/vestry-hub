-- Drop the wrong FK (member_id → users) and replace with members table
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_member_id_fkey;

-- Add correct FK to members table
ALTER TABLE survey_responses
  ADD CONSTRAINT survey_responses_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL;

-- Add member_name column to store name at submission time
ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS member_name text;;
