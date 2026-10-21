
-- ============================================================
-- Member Portal Events RLS - Legacy Policy Cleanup
-- Migration: 20260422210221
-- ============================================================
--
-- This migration duplicates the earlier member-portal
-- anonymous access policies.
--
-- Do not recreate unrestricted anonymous policies.
-- Preserve existing tenant-scoped RLS.
-- Skip tables that do not exist.
-- ============================================================

DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN
        SELECT *
        FROM (
            VALUES
                ('events', 'events_public_read'),
                ('services', 'services_public_read'),

                ('event_rsvps', 'event_rsvps_public_read'),
                ('event_rsvps', 'event_rsvps_public_insert'),
                ('event_rsvps', 'event_rsvps_public_update'),

                ('service_attendance', 'service_attendance_public_read'),
                ('service_attendance', 'service_attendance_public_insert'),
                ('service_attendance', 'service_attendance_public_update')
        ) AS policies_to_remove(table_name, policy_name)

    LOOP
        IF to_regclass(
            format('public.%I', item.table_name)
        ) IS NOT NULL THEN

            EXECUTE format(
                'DROP POLICY IF EXISTS %I ON public.%I',
                item.policy_name,
                item.table_name
            );

        END IF;
    END LOOP;
END
$$;
