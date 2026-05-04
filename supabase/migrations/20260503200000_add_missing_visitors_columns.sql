-- Add missing columns to visitors table
-- These columns are used in the Visitors.tsx component but were missing from the original schema

-- Add city column
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS city varchar;

-- Add gender column
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS gender varchar;

-- Add follow_up_status column (tracks visitor follow-up progress)
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS follow_up_status varchar DEFAULT 'new';

-- Add how_heard_detail column (stores preferred contact method)
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS how_heard_detail varchar;

-- Add comment for documentation
COMMENT ON COLUMN visitors.city IS 'City where the visitor is from';
COMMENT ON COLUMN visitors.gender IS 'Gender of the visitor (male, female, other)';
COMMENT ON COLUMN visitors.follow_up_status IS 'Follow-up status: new, contacted, integrated, converted';
COMMENT ON COLUMN visitors.how_heard_detail IS 'Preferred contact method: phone_call, sms, email, whatsapp';
