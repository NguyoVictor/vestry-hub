-- Add meeting_date field to groups table
-- This allows specifying the exact date for the next group meeting

ALTER TABLE groups 
ADD COLUMN meeting_date date;

COMMENT ON COLUMN groups.meeting_date IS 'Specific date for the next group meeting';;
