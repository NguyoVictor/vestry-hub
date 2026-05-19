DROP POLICY IF EXISTS "messages_public_delete" ON messages;
CREATE POLICY "messages_public_delete" ON messages FOR DELETE TO anon USING (true);
DROP POLICY IF EXISTS "messages_public_insert" ON messages;
CREATE POLICY "messages_public_insert" ON messages FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "conversations_public_update" ON conversations;
CREATE POLICY "conversations_public_update" ON conversations FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "conv_participants_public_update" ON conversation_participants;
CREATE POLICY "conv_participants_public_update" ON conversation_participants FOR UPDATE TO anon USING (true);
