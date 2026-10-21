
-- =====================================================
-- MEMBER PORTAL LEGACY PUBLIC POLICY CLEANUP
-- Migration: 20260407091627
-- =====================================================
--
-- SECURITY:
-- This migration previously created unrestricted
-- USING (true) and WITH CHECK (true) policies.
--
-- Those policies are unsafe for a multi-tenant
-- church management platform.
--
-- Existing tenant-scoped RLS policies are preserved.
-- No anonymous or unrestricted access is granted.
--
-- The obsolete event_rsvps table is not referenced.
--
-- =====================================================

-- Announcements
DROP POLICY IF EXISTS "announcements_public_read"
ON public.announcements;

-- Events
DROP POLICY IF EXISTS "events_public_read"
ON public.events;

-- Giving records
DROP POLICY IF EXISTS "giving_records_public_read"
ON public.giving_records;

DROP POLICY IF EXISTS "giving_records_public_insert"
ON public.giving_records;

-- Groups
DROP POLICY IF EXISTS "groups_public_read"
ON public.groups;

-- Group memberships
DROP POLICY IF EXISTS "group_members_public_read"
ON public.group_members;

-- Testimonies
DROP POLICY IF EXISTS "testimonies_public_read"
ON public.testimonies;

DROP POLICY IF EXISTS "testimonies_public_insert"
ON public.testimonies;

-- Studio media
DROP POLICY IF EXISTS "studio_media_public_read"
ON public.studio_media;

-- Surveys
DROP POLICY IF EXISTS "surveys_public_read"
ON public.surveys;

-- Activity logs
DROP POLICY IF EXISTS "activity_log_public_insert"
ON public.activity_log;

-- Member requests
DROP POLICY IF EXISTS "member_requests_public_read"
ON public.member_requests;

DROP POLICY IF EXISTS "member_requests_public_insert"
ON public.member_requests;

-- =====================================================
-- END OF LEGACY PUBLIC POLICY CLEANUP
-- =====================================================
--
-- IMPORTANT:
-- The existing tenant-scoped policies continue to
-- control access to these tables.
--
-- Member portal functionality must use properly
-- authorized requests rather than unrestricted
-- anonymous database access.
--
-- Any required public functionality should receive
-- a separately reviewed, narrowly scoped policy.
-- =====================================================
