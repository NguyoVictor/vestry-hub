-- =====================================================
-- Migration: Add Watch Live Feature Columns
-- Description: Adds columns to livestream_schedules for the Watch Live feature
-- Date: 2026-05-03
-- =====================================================

-- Add new columns to livestream_schedules table
ALTER TABLE livestream_schedules
  ADD COLUMN IF NOT EXISTS stream_provider TEXT CHECK (stream_provider IN ('youtube', 'facebook', 'jitsi', 'custom')),
  ADD COLUMN IF NOT EXISTS stream_url TEXT,
  ADD COLUMN IF NOT EXISTS jitsi_room TEXT,
  ADD COLUMN IF NOT EXISTS pastor_name TEXT,
  ADD COLUMN IF NOT EXISTS series_name TEXT,
  ADD COLUMN IF NOT EXISTS scripture TEXT,
  ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS recording_duration INTEGER,
  ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- Create index for stream provider queries
CREATE INDEX IF NOT EXISTS idx_livestream_schedules_provider ON livestream_schedules (tenant_id, stream_provider);

-- Create index for ended streams (recordings)
CREATE INDEX IF NOT EXISTS idx_livestream_schedules_ended ON livestream_schedules (tenant_id, ended_at) WHERE ended_at IS NOT NULL;

COMMENT ON COLUMN livestream_schedules.stream_provider IS 'Streaming platform: youtube, facebook, jitsi, or custom';
COMMENT ON COLUMN livestream_schedules.stream_url IS 'URL for YouTube/Facebook/custom streams';
COMMENT ON COLUMN livestream_schedules.jitsi_room IS 'Auto-generated Jitsi room name';
COMMENT ON COLUMN livestream_schedules.pastor_name IS 'Name of the pastor/speaker';
COMMENT ON COLUMN livestream_schedules.series_name IS 'Name of the sermon series';
COMMENT ON COLUMN livestream_schedules.scripture IS 'Scripture reference for the service';
COMMENT ON COLUMN livestream_schedules.chat_enabled IS 'Whether live chat is enabled';
COMMENT ON COLUMN livestream_schedules.thumbnail_url IS 'Thumbnail image for recordings';
COMMENT ON COLUMN livestream_schedules.recording_url IS 'URL to the recorded video';
COMMENT ON COLUMN livestream_schedules.recording_duration IS 'Duration of recording in seconds';
COMMENT ON COLUMN livestream_schedules.viewer_count IS 'Number of viewers during the stream';
COMMENT ON COLUMN livestream_schedules.ended_at IS 'Timestamp when the stream ended';
