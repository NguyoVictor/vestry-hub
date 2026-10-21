-- =====================================================
-- DROP LEGACY FOREIGN KEYS TO USERS
-- Migration: 20260407172207
-- =====================================================
--
-- Some legacy tables may not exist in a fresh deployment.
-- Only drop a constraint when its table exists.
--
-- This migration does not delete tables or records.
-- =====================================================

DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN
        SELECT *
        FROM (
            VALUES
                ('group_members', 'group_members_member_id_fkey'),
                ('follow_up_tasks', 'follow_up_tasks_related_member_id_fkey'),
                ('follow_up_tasks', 'follow_up_tasks_assigned_to_fkey'),
                ('follow_up_tasks', 'follow_up_tasks_created_by_fkey'),
                ('volunteers', 'volunteers_member_id_fkey'),
                ('volunteer_assignments', 'volunteer_assignments_member_id_fkey'),
                ('meeting_attendees', 'meeting_attendees_member_id_fkey'),
                ('event_registrations', 'event_registrations_member_id_fkey'),
                ('attendance_records', 'attendance_records_member_id_fkey')
        ) AS constraints_to_remove(table_name, constraint_name)
    LOOP
        IF to_regclass('public.' || item.table_name) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
                item.table_name,
                item.constraint_name
            );
        END IF;
    END LOOP;
END
$$;