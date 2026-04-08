-- Drop FK that requires group_members.member_id to exist in users table
-- Members now live in the members table, not users
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_member_id_fkey;

-- Also check and fix other tables that may have similar FKs to users
ALTER TABLE follow_up_tasks DROP CONSTRAINT IF EXISTS follow_up_tasks_related_member_id_fkey;
ALTER TABLE follow_up_tasks DROP CONSTRAINT IF EXISTS follow_up_tasks_assigned_to_fkey;
ALTER TABLE follow_up_tasks DROP CONSTRAINT IF EXISTS follow_up_tasks_created_by_fkey;
ALTER TABLE volunteers DROP CONSTRAINT IF EXISTS volunteers_member_id_fkey;
ALTER TABLE volunteer_assignments DROP CONSTRAINT IF EXISTS volunteer_assignments_member_id_fkey;
ALTER TABLE meeting_attendees DROP CONSTRAINT IF EXISTS meeting_attendees_member_id_fkey;
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_member_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_member_id_fkey;;
