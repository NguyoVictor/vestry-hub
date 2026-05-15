-- Add RLS policies for live_chat_messages

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage chat messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Members can read chat messages" ON live_chat_messages;
DROP POLICY IF EXISTS "Members can insert chat messages" ON live_chat_messages;

-- Admins: Full access to their tenant's messages
CREATE POLICY "Admins can manage chat messages"
  ON live_chat_messages
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()::text
    )
  );

-- Members: Can read messages from their tenant
CREATE POLICY "Members can read chat messages"
  ON live_chat_messages
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM members WHERE id = auth.uid()::text
    )
  );

-- Members: Can insert their own messages
CREATE POLICY "Members can insert chat messages"
  ON live_chat_messages
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM members WHERE id = auth.uid()::text
    )
    AND member_id = auth.uid()::text
  );;
