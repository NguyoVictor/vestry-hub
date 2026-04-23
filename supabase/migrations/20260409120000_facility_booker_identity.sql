-- Add booker identity columns to facilities table
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS booker_type VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_name VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_org_name VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_contact_person VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_phone VARCHAR,
  ADD COLUMN IF NOT EXISTS booker_email VARCHAR;
