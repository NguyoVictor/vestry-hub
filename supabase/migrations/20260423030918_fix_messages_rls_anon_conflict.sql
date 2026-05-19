-- The public role ALL policy blocks anon inserts because get_my_tenant_id() returns NULL for anon.
-- Restrict the tenant_rls policy to authenticated role only.
DROP POLICY IF EXISTS "messages_tenant_rls" ON messages;
CREATE POLICY "messages_tenant_rls" ON messages
  FOR ALL TO authenticated
  USING ((tenant_id)::text = (get_my_tenant_id())::text);
-- Same fix for conversations
DROP POLICY IF EXISTS "conversations_tenant_rls" ON conversations;
CREATE POLICY "conversations_tenant_rls" ON conversations
  FOR ALL TO authenticated
  USING ((tenant_id)::text = (get_my_tenant_id())::text);
-- Same fix for conversation_participants
DROP POLICY IF EXISTS "conv_participants_rls" ON conversation_participants;
CREATE POLICY "conv_participants_rls" ON conversation_participants
  FOR ALL TO authenticated
  USING ((conversation_id)::text IN (
    SELECT conversations.id FROM conversations
    WHERE (conversations.tenant_id)::text = (get_my_tenant_id())::text
  ));
