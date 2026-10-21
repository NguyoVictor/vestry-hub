
-- =====================================================
-- DROP REMAINING LEGACY FOREIGN KEYS TO USERS
-- Migration: 20260407172503
-- =====================================================
--
-- Remove legacy foreign-key constraints that reference
-- users.id as part of the member identity migration.
--
-- Skip tables or constraints that do not exist.
-- No tables or records are deleted.
-- =====================================================

DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN
        SELECT *
        FROM (
            VALUES
                ('announcements', 'announcements_created_by_fkey'),
                ('branches', 'branches_pastor_id_fkey'),
                ('events', 'events_created_by_fkey'),
                ('families', 'families_head_of_household_id_fkey'),
                ('groups', 'groups_leader_id_fkey'),
                ('member_requests', 'member_requests_member_id_fkey'),
                ('member_requests', 'member_requests_assigned_to_fkey'),
                ('new_converts', 'new_converts_member_id_fkey'),
                ('new_converts', 'new_converts_counsellor_id_fkey'),
                ('services', 'services_created_by_fkey'),
                ('visitors', 'visitors_converted_to_member_id_fkey')
        ) AS constraints_to_remove(table_name, constraint_name)
    LOOP
        IF to_regclass(format('public.%I', item.table_name)) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
                item.table_name,
                item.constraint_name
            );
        END IF;
    END LOOP;
END
$$;
