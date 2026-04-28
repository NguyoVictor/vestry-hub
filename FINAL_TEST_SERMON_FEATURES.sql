-- 🧪 FINAL TEST - Check if everything is ready
-- This will tell you exactly what's working and what's not

-- ============================================================================
-- TEST 1: Check all tables exist
-- ============================================================================
SELECT 
  'TEST 1: Tables Exist' as test_name,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS - All 4 tables exist'
    ELSE '❌ FAIL - Missing tables: ' || (4 - COUNT(*))::text
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sermon_reactions', 'sermon_bookmarks', 'sermon_notes', 'sermon_views');

-- ============================================================================
-- TEST 2: Check sermons table has new columns
-- ============================================================================
SELECT 
  'TEST 2: Sermons Columns' as test_name,
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ PASS - is_featured and view_count exist'
    ELSE '❌ FAIL - Missing columns'
  END as result
FROM information_schema.columns
WHERE table_name = 'sermons'
AND column_name IN ('is_featured', 'view_count');

-- ============================================================================
-- TEST 3: Check RLS is enabled
-- ============================================================================
SELECT 
  'TEST 3: RLS Enabled' as test_name,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS - RLS enabled on all tables'
    ELSE '❌ FAIL - RLS not enabled on all tables'
  END as result
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('sermon_reactions', 'sermon_bookmarks', 'sermon_notes', 'sermon_views')
AND rowsecurity = true;

-- ============================================================================
-- TEST 4: Check RLS policies exist
-- ============================================================================
SELECT 
  'TEST 4: RLS Policies' as test_name,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ PASS - ' || COUNT(*)::text || ' policies exist'
    ELSE '⚠️ WARNING - Only ' || COUNT(*)::text || ' policies (expected 10+)'
  END as result
FROM pg_policies 
WHERE tablename IN ('sermon_reactions', 'sermon_bookmarks', 'sermon_notes', 'sermon_views');

-- ============================================================================
-- TEST 5: Check triggers exist
-- ============================================================================
SELECT 
  'TEST 5: Triggers' as test_name,
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ PASS - Both triggers exist'
    ELSE '❌ FAIL - Missing triggers'
  END as result
FROM information_schema.triggers
WHERE event_object_table IN ('sermon_views', 'sermon_notes')
AND trigger_name IN ('trigger_increment_sermon_views', 'trigger_update_sermon_notes_timestamp');

-- ============================================================================
-- 📊 DETAILED BREAKDOWN
-- ============================================================================

-- Show which tables exist
SELECT '📋 Tables:' as section, table_name, 'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sermon_reactions', 'sermon_bookmarks', 'sermon_notes', 'sermon_views')
ORDER BY table_name;

-- Show which policies exist
SELECT '🔒 Policies:' as section, tablename, policyname, cmd as operation
FROM pg_policies 
WHERE tablename IN ('sermon_reactions', 'sermon_bookmarks', 'sermon_notes', 'sermon_views')
ORDER BY tablename, policyname;

-- ============================================================================
-- 🎯 FINAL VERDICT
-- ============================================================================
SELECT 
  '🎯 FINAL VERDICT' as section,
  CASE 
    WHEN 
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('sermon_reactions', 'sermon_bookmarks', 'sermon_notes', 'sermon_views')) = 4
      AND
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sermons' AND column_name IN ('is_featured', 'view_count')) = 2
      AND
      (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table IN ('sermon_views', 'sermon_notes') AND trigger_name IN ('trigger_increment_sermon_views', 'trigger_update_sermon_notes_timestamp')) = 2
    THEN '✅ READY TO USE - All sermon features are set up correctly!'
    ELSE '⚠️ NEEDS ATTENTION - Some features are missing'
  END as verdict;
