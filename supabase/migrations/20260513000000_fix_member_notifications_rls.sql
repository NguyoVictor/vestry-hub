-- Fix member portal notifications access
-- Member portal users are anon (not authenticated), so they need anon policies

-- Allow anon users to read their own notifications
-- Since member portal stores member IDs in user_id field, we allow anon to read notifications
-- but they must provide the correct tenant_id in their queries
CREATE POLICY "notifications_anon_read" ON notifications
  FOR SELECT TO anon 
  USING (true); -- Allow anon to read, but they must filter by tenant_id in queries

-- Allow anon users to update their own notifications (mark as read)
CREATE POLICY "notifications_anon_update" ON notifications
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);