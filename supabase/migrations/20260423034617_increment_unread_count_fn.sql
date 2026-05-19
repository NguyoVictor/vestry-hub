-- Function to safely increment unread_count for a participant
CREATE OR REPLACE FUNCTION increment_unread_count(p_conversation_id text, p_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversation_participants
  SET unread_count = COALESCE(unread_count, 0) + 1
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$;
-- Grant execute to both authenticated and anon
GRANT EXECUTE ON FUNCTION increment_unread_count(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_unread_count(text, text) TO anon;
