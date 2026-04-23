-- Allow anon to read conversation_participants (needed to find member's conversations)
DROP POLICY IF EXISTS "conv_participants_public_read" ON conversation_participants;
CREATE POLICY "conv_participants_public_read" ON conversation_participants
  FOR SELECT TO anon USING (true);

-- Allow anon to read conversations
DROP POLICY IF EXISTS "conversations_public_read" ON conversations;
CREATE POLICY "conversations_public_read" ON conversations
  FOR SELECT TO anon USING (true);

-- Allow anon to read messages
DROP POLICY IF EXISTS "messages_public_read" ON messages;
CREATE POLICY "messages_public_read" ON messages
  FOR SELECT TO anon USING (true);

-- Allow anon to insert messages (member replies)
DROP POLICY IF EXISTS "messages_public_insert" ON messages;
CREATE POLICY "messages_public_insert" ON messages
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to update conversations (update updated_at on send)
DROP POLICY IF EXISTS "conversations_public_update" ON conversations;
CREATE POLICY "conversations_public_update" ON conversations
  FOR UPDATE TO anon USING (true);;
