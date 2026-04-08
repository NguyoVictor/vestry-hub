-- Open read policies for member portal (anon key, no Supabase Auth session)
-- These allow reading by tenant_id which is stored in the member's localStorage session

DROP POLICY IF EXISTS "announcements_public_read" ON announcements;
CREATE POLICY "announcements_public_read" ON announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "events_public_read" ON events;
CREATE POLICY "events_public_read" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_rsvps_public_read" ON event_rsvps;
CREATE POLICY "event_rsvps_public_read" ON event_rsvps FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_rsvps_public_insert" ON event_rsvps;
CREATE POLICY "event_rsvps_public_insert" ON event_rsvps FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "event_rsvps_public_update" ON event_rsvps;
CREATE POLICY "event_rsvps_public_update" ON event_rsvps FOR UPDATE USING (true);

DROP POLICY IF EXISTS "giving_records_public_read" ON giving_records;
CREATE POLICY "giving_records_public_read" ON giving_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "giving_records_public_insert" ON giving_records;
CREATE POLICY "giving_records_public_insert" ON giving_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "groups_public_read" ON groups;
CREATE POLICY "groups_public_read" ON groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "group_members_public_read" ON group_members;
CREATE POLICY "group_members_public_read" ON group_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "testimonies_public_read" ON testimonies;
CREATE POLICY "testimonies_public_read" ON testimonies FOR SELECT USING (true);

DROP POLICY IF EXISTS "testimonies_public_insert" ON testimonies;
CREATE POLICY "testimonies_public_insert" ON testimonies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "studio_media_public_read" ON studio_media;
CREATE POLICY "studio_media_public_read" ON studio_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "surveys_public_read" ON surveys;
CREATE POLICY "surveys_public_read" ON surveys FOR SELECT USING (true);

DROP POLICY IF EXISTS "activity_log_public_insert" ON activity_log;
CREATE POLICY "activity_log_public_insert" ON activity_log FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "member_requests_public_read" ON member_requests;
CREATE POLICY "member_requests_public_read" ON member_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "member_requests_public_insert" ON member_requests;
CREATE POLICY "member_requests_public_insert" ON member_requests FOR INSERT WITH CHECK (true);;
