-- Add 'scheduled' to comm_status_enum
ALTER TYPE comm_status_enum ADD VALUE IF NOT EXISTS 'scheduled';