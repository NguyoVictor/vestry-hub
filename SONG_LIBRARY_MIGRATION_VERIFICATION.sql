-- =====================================================
-- Song Library UI Revamp - Migration Verification Script
-- =====================================================
-- This script verifies that the database migration was applied correctly
-- Run this against your Supabase database to check the schema changes

-- Check if new columns were added to songs table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'songs' 
AND column_name IN (
  'bpm', 'time_signature', 'cover_art_url', 'cover_art_colors',
  'duration_seconds', 'usage_count', 'last_played_at', 
  'custom_fields', 'is_trending', 'updated_at'
)
ORDER BY column_name;

-- Check if new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_song_preferences',
  'song_usage_analytics', 
  'setlist_collaborations',
  'setlist_change_history'
)
ORDER BY table_name;

-- Check if indexes were created
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('songs', 'song_usage_analytics', 'setlist_collaborations', 'setlist_change_history')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check if RLS policies were created
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN (
  'user_song_preferences',
  'song_usage_analytics', 
  'setlist_collaborations',
  'setlist_change_history'
)
ORDER BY tablename, policyname;

-- Check if storage bucket was created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'song-cover-art';

-- Check if storage policies were created
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%song_cover_art%'
ORDER BY policyname;

-- Check if functions were created
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_song_usage_stats',
  'cleanup_inactive_collaborations',
  'get_trending_songs'
)
ORDER BY routine_name;

-- Check if triggers were created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_song_usage_stats';

-- Sample data verification queries
-- (Run these after adding some test data)

-- Check songs with new metadata
-- SELECT id, title, artist, bpm, time_signature, usage_count, is_trending 
-- FROM songs 
-- WHERE tenant_id = 'your-tenant-id'
-- LIMIT 5;

-- Check user preferences
-- SELECT * FROM user_song_preferences 
-- WHERE tenant_id = 'your-tenant-id'
-- LIMIT 5;

-- Check usage analytics
-- SELECT * FROM song_usage_analytics 
-- WHERE tenant_id = 'your-tenant-id'
-- ORDER BY used_at DESC
-- LIMIT 5;

-- Test trending songs function
-- SELECT * FROM get_trending_songs('your-tenant-id', 5);