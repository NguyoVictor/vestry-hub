-- =====================================================
-- Migration: Create Live Chat Messages Table
-- Description: Creates table for live chat during streaming
-- Date: 2026-05-03
-- =====================================================

-- Create live_chat_messages table
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stream_id TEXT NOT NULL REFERENCES livestream_schedules(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  member_avatar TEXT,
  message TEXT NOT NULL DEFAULT '',
  reaction TEXT,
  is_pinned BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_stream ON live_chat_messages (tenant_id, stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_member ON live_chat_messages (member_id);
-- Enable Row Level Security
ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;
-- RLS Policies for live_chat_messages

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
  );
-- Enable Supabase Realtime (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_chat_messages;
  END IF;
END $$;
-- Add comments
COMMENT ON TABLE live_chat_messages IS 'Live chat messages during streaming services';
COMMENT ON COLUMN live_chat_messages.stream_id IS 'Reference to the livestream schedule';
COMMENT ON COLUMN live_chat_messages.member_id IS 'Member who sent the message (nullable for anonymous)';
COMMENT ON COLUMN live_chat_messages.member_name IS 'Display name of the sender';
COMMENT ON COLUMN live_chat_messages.message IS 'Text message content';
COMMENT ON COLUMN live_chat_messages.reaction IS 'Emoji reaction (if this is a reaction message)';
COMMENT ON COLUMN live_chat_messages.is_pinned IS 'Whether this message is pinned by admin';
COMMENT ON COLUMN live_chat_messages.is_admin IS 'Whether the sender is an admin/host';
