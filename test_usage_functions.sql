-- Test if usage analytics functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_usage_reports', 'update_trending_songs', 'get_song_recommendations', 'get_usage_analytics_summary');