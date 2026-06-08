CREATE OR REPLACE FUNCTION batch_increment_unread_count(
  p_conversation_id text,
  p_excluding_user_id text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE conversation_participants
  SET unread_count = COALESCE(unread_count, 0) + 1
  WHERE conversation_id = p_conversation_id
    AND user_id != p_excluding_user_id;
$$;

GRANT EXECUTE ON FUNCTION batch_increment_unread_count(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_increment_unread_count(text, text) TO anon;
