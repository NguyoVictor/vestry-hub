-- ============================================================
-- Member Portal: Allow anon reads on published events/services
-- ============================================================
-- The member portal uses a custom session (not Supabase Auth),
-- so auth.uid() is NULL and get_my_tenant_id() returns NULL.
-- We need explicit anon SELECT policies so members can read
-- published events and services for their church.
-- ============================================================

-- ── EVENTS: allow anon to read published events ──────────────
DROP POLICY IF EXISTS "events_public_read" ON events;
CREATE POLICY "events_public_read" ON events
  FOR SELECT
  TO anon
  USING (status = 'published' OR is_published = true);

-- ── SERVICES: allow anon to read all services ────────────────
-- Services don't have a draft/published concept on the admin side,
-- so we allow all service reads scoped only by tenant_id in the query.
DROP POLICY IF EXISTS "services_public_read" ON services;
CREATE POLICY "services_public_read" ON services
  FOR SELECT
  TO anon
  USING (true);

-- ── EVENT_RSVPS: allow anon to insert/read their own RSVPs ───
-- Members need to RSVP to events from the portal.
DROP POLICY IF EXISTS "event_rsvps_public_read" ON event_rsvps;
CREATE POLICY "event_rsvps_public_read" ON event_rsvps
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "event_rsvps_public_insert" ON event_rsvps;
CREATE POLICY "event_rsvps_public_insert" ON event_rsvps
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "event_rsvps_public_update" ON event_rsvps;
CREATE POLICY "event_rsvps_public_update" ON event_rsvps
  FOR UPDATE
  TO anon
  USING (true);

-- ── SERVICE_ATTENDANCE: allow anon to record attendance ──────
DROP POLICY IF EXISTS "service_attendance_public_read" ON service_attendance;
CREATE POLICY "service_attendance_public_read" ON service_attendance
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "service_attendance_public_insert" ON service_attendance;
CREATE POLICY "service_attendance_public_insert" ON service_attendance
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_attendance_public_update" ON service_attendance;
CREATE POLICY "service_attendance_public_update" ON service_attendance
  FOR UPDATE
  TO anon
  USING (true);
