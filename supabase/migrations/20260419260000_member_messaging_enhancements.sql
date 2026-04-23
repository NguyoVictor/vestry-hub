-- Add status column to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'open';
-- Add description to conversations (for group chats)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS description text;
-- Add is_forum flag for Church Forum group
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_forum boolean DEFAULT false;
-- Add read_at to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
-- Add conversation_id to messages for proper threading
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id varchar REFERENCES conversations(id) ON DELETE CASCADE;
-- Index for fast message lookup by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_type ON conversations(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
