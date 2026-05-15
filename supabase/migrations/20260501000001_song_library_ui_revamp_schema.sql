-- =====================================================
-- Song Library UI Revamp - Database Schema Enhancement
-- =====================================================
-- This migration enhances the existing song library with:
-- 1. Enhanced song schema with new metadata fields
-- 2. User preferences for theme and view settings
-- 3. Usage analytics tracking
-- 4. Real-time collaboration support
-- 5. Performance indexes for search optimization
-- 6. Row Level Security (RLS) policies for tenant isolation

-- =====================================================
-- Phase 1: Enhance existing songs table
-- =====================================================

-- Add new columns to existing songs table for enhanced metadata
ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS bpm integer,
ADD COLUMN IF NOT EXISTS time_signature varchar(10),
ADD COLUMN IF NOT EXISTS cover_art_url text,
ADD COLUMN IF NOT EXISTS cover_art_colors jsonb,
ADD COLUMN IF NOT EXISTS duration_seconds integer,
ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_played_at timestamptz,
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
-- Add check constraints for data validation
ALTER TABLE songs 
ADD CONSTRAINT songs_bpm_range CHECK (bpm IS NULL OR (bpm >= 40 AND bpm <= 300)),
ADD CONSTRAINT songs_duration_positive CHECK (duration_seconds IS NULL OR duration_seconds > 0),
ADD CONSTRAINT songs_usage_count_positive CHECK (usage_count >= 0);
-- =====================================================
-- Phase 2: Create new tables for enhanced functionality
-- =====================================================

-- User preferences for theme, view mode, and personalization
CREATE TABLE IF NOT EXISTS user_song_preferences (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme varchar(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  view_mode varchar(10) DEFAULT 'grid' CHECK (view_mode IN ('grid', 'list')),
  transposition_preferences jsonb DEFAULT '{}', -- songId -> semitones mapping
  filter_presets jsonb DEFAULT '[]', -- saved filter combinations
  recent_searches text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
-- Usage analytics for tracking song performance and trends
CREATE TABLE IF NOT EXISTS song_usage_analytics (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  song_id varchar NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  service_type varchar, -- worship, pre-service, special, etc.
  used_at timestamptz DEFAULT now(),
  setlist_id varchar REFERENCES set_lists(id) ON DELETE SET NULL,
  key_used varchar, -- actual key used (may be transposed)
  duration_played integer, -- seconds played
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
-- Real-time collaboration tracking for setlist editing
CREATE TABLE IF NOT EXISTS setlist_collaborations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  setlist_id varchar NOT NULL REFERENCES set_lists(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  cursor_position jsonb, -- current editing position
  created_at timestamptz DEFAULT now(),
  UNIQUE(setlist_id, user_id)
);
-- Change history for undo/redo functionality in collaborative editing
CREATE TABLE IF NOT EXISTS setlist_change_history (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  setlist_id varchar NOT NULL REFERENCES set_lists(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_type varchar NOT NULL, -- add, remove, reorder, update
  change_data jsonb NOT NULL, -- details of the change
  previous_state jsonb, -- state before change for undo
  created_at timestamptz DEFAULT now()
);
-- =====================================================
-- Phase 3: Performance indexes for search optimization
-- =====================================================

-- Indexes for enhanced songs table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_bpm ON songs(bpm) WHERE bpm IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_time_signature ON songs(time_signature) WHERE time_signature IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_usage_count ON songs(usage_count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_last_played ON songs(last_played_at DESC) WHERE last_played_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_is_trending ON songs(is_trending) WHERE is_trending = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_tags_gin ON songs USING GIN(tags) WHERE tags IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_cover_colors_gin ON songs USING GIN(cover_art_colors) WHERE cover_art_colors IS NOT NULL;
-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_tenant_usage ON songs(tenant_id, usage_count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_tenant_trending ON songs(tenant_id, is_trending) WHERE is_trending = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_tenant_bpm ON songs(tenant_id, bpm) WHERE bpm IS NOT NULL;
-- Full-text search index for song content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_search ON songs USING GIN(
  to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(artist, '') || ' ' || 
    COALESCE(lyrics, '') || ' ' ||
    COALESCE(array_to_string(tags, ' '), '')
  )
);
-- Indexes for usage analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_usage_tenant_song ON song_usage_analytics(tenant_id, song_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_usage_date ON song_usage_analytics(used_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_usage_service_type ON song_usage_analytics(tenant_id, service_type) WHERE service_type IS NOT NULL;
-- Indexes for collaboration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_collaborations_setlist ON setlist_collaborations(setlist_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_collaborations_user ON setlist_collaborations(user_id) WHERE is_active = true;
-- Indexes for change history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_change_history_setlist ON setlist_change_history(setlist_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_change_history_user ON setlist_change_history(user_id, created_at DESC);
-- =====================================================
-- Phase 4: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE user_song_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_change_history ENABLE ROW LEVEL SECURITY;
-- User preferences policies - users can only access their own preferences
CREATE POLICY user_song_preferences_isolation ON user_song_preferences
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text) AND 
    user_id = auth.uid()::text
  );
-- Usage analytics policies - tenant isolation
CREATE POLICY song_usage_analytics_tenant_isolation ON song_usage_analytics
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
-- Collaboration policies - access through setlist ownership
CREATE POLICY setlist_collaborations_tenant_isolation ON setlist_collaborations
  FOR ALL USING (
    setlist_id IN (
      SELECT id FROM set_lists 
      WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text)
    )
  );
-- Change history policies - access through setlist ownership
CREATE POLICY setlist_change_history_tenant_isolation ON setlist_change_history
  FOR ALL USING (
    setlist_id IN (
      SELECT id FROM set_lists 
      WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text)
    )
  );
-- =====================================================
-- Phase 5: Storage buckets for cover art
-- =====================================================

-- Create storage bucket for song cover art if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'song-cover-art', 
  'song-cover-art', 
  false, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
-- Storage policies for cover art - tenant isolation
DO $$ 
BEGIN
  -- Allow authenticated users to upload cover art for their tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'song_cover_art_upload_policy'
  ) THEN
    CREATE POLICY song_cover_art_upload_policy ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'song-cover-art' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = (SELECT tenant_id FROM users WHERE id = auth.uid()::text)
      );
  END IF;

  -- Allow users to view cover art from their tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'song_cover_art_select_policy'
  ) THEN
    CREATE POLICY song_cover_art_select_policy ON storage.objects
      FOR SELECT USING (
        bucket_id = 'song-cover-art' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = (SELECT tenant_id FROM users WHERE id = auth.uid()::text)
      );
  END IF;

  -- Allow users to update cover art from their tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'song_cover_art_update_policy'
  ) THEN
    CREATE POLICY song_cover_art_update_policy ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'song-cover-art' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = (SELECT tenant_id FROM users WHERE id = auth.uid()::text)
      );
  END IF;

  -- Allow users to delete cover art from their tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'song_cover_art_delete_policy'
  ) THEN
    CREATE POLICY song_cover_art_delete_policy ON storage.objects
      FOR DELETE USING (
        bucket_id = 'song-cover-art' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = (SELECT tenant_id FROM users WHERE id = auth.uid()::text)
      );
  END IF;
END $$;
-- =====================================================
-- Phase 6: Utility functions for analytics and trends
-- =====================================================

-- Function to update song usage count and trending status
CREATE OR REPLACE FUNCTION update_song_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage count and last played date
  UPDATE songs 
  SET 
    usage_count = usage_count + 1,
    last_played_at = NEW.used_at,
    updated_at = now()
  WHERE id = NEW.song_id;

  -- Update trending status based on recent usage
  -- A song is trending if it has been used 3+ times in the last 30 days
  UPDATE songs 
  SET is_trending = (
    SELECT COUNT(*) >= 3
    FROM song_usage_analytics 
    WHERE song_id = NEW.song_id 
    AND used_at >= now() - interval '30 days'
  )
  WHERE id = NEW.song_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to automatically update song stats when usage is recorded
DROP TRIGGER IF EXISTS trigger_update_song_usage_stats ON song_usage_analytics;
CREATE TRIGGER trigger_update_song_usage_stats
  AFTER INSERT ON song_usage_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_song_usage_stats();
-- Function to clean up old collaboration sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_collaborations()
RETURNS void AS $$
BEGIN
  -- Mark collaborations as inactive if user hasn't been seen for 5 minutes
  UPDATE setlist_collaborations 
  SET is_active = false
  WHERE is_active = true 
  AND last_seen_at < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to get trending songs for a tenant
CREATE OR REPLACE FUNCTION get_trending_songs(p_tenant_id varchar, p_limit integer DEFAULT 10)
RETURNS TABLE(
  song_id varchar,
  title varchar,
  artist varchar,
  usage_count integer,
  recent_usage_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.artist,
    s.usage_count,
    COUNT(sua.id) as recent_usage_count
  FROM songs s
  LEFT JOIN song_usage_analytics sua ON s.id = sua.song_id 
    AND sua.used_at >= now() - interval '30 days'
  WHERE s.tenant_id = p_tenant_id
  GROUP BY s.id, s.title, s.artist, s.usage_count
  ORDER BY recent_usage_count DESC, s.usage_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- Phase 7: Update existing schema constants
-- =====================================================

-- Add comments to document the enhanced schema
COMMENT ON TABLE songs IS 'Enhanced song library with metadata for premium music application features';
COMMENT ON COLUMN songs.bpm IS 'Beats per minute for tempo-based filtering and display';
COMMENT ON COLUMN songs.time_signature IS 'Musical time signature (e.g., 4/4, 3/4, 6/8)';
COMMENT ON COLUMN songs.cover_art_url IS 'URL to song cover art image in storage';
COMMENT ON COLUMN songs.cover_art_colors IS 'Extracted dominant colors from cover art for ambient effects';
COMMENT ON COLUMN songs.duration_seconds IS 'Song duration in seconds for setlist planning';
COMMENT ON COLUMN songs.usage_count IS 'Total number of times song has been used in services';
COMMENT ON COLUMN songs.last_played_at IS 'Timestamp of most recent usage';
COMMENT ON COLUMN songs.custom_fields IS 'Church-specific metadata fields';
COMMENT ON COLUMN songs.is_trending IS 'Whether song is currently trending based on recent usage';
COMMENT ON TABLE user_song_preferences IS 'User preferences for song library UI and personalization';
COMMENT ON TABLE song_usage_analytics IS 'Detailed analytics for song usage patterns and trends';
COMMENT ON TABLE setlist_collaborations IS 'Real-time collaboration tracking for setlist editing';
COMMENT ON TABLE setlist_change_history IS 'Change history for undo/redo functionality in collaborative editing';
-- =====================================================
-- Migration Complete
-- =====================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Song Library UI Revamp schema migration completed successfully';
  RAISE NOTICE 'Enhanced songs table with % new columns', (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_name = 'songs' 
    AND column_name IN ('bpm', 'time_signature', 'cover_art_url', 'cover_art_colors', 'duration_seconds', 'usage_count', 'last_played_at', 'custom_fields', 'is_trending')
  );
  RAISE NOTICE 'Created % new tables for enhanced functionality', 4;
  RAISE NOTICE 'Added % performance indexes for search optimization', (
    SELECT COUNT(*) FROM pg_indexes 
    WHERE tablename IN ('songs', 'song_usage_analytics', 'setlist_collaborations', 'setlist_change_history')
    AND indexname LIKE 'idx_%'
  );
END $$;
