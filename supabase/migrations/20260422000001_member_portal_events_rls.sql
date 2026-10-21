
-- ============================================================
-- Member Portal: Remove unsafe legacy anonymous policies
-- Migration: 20260422000001
-- ============================================================
--
-- The member portal uses custom sessions rather than
-- ordinary Supabase Auth sessions.
--
-- Unrestricted anon access must not be used to bypass
-- tenant isolation.
--
-- Missing legacy tables are skipped safely.
-- Existing tenant-scoped policies are preserved.
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
        IF to_regclass(format('public.%I', item.table_name))
            IS NOT NULL THEN

            EXECUTE format(
                'DROP POLICY IF EXISTS %I ON public.%I',
                item.policy_name,
                item.table_name
            );

        END IF;
    END LOOP;
END
$$;
