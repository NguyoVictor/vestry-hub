-- ✅ VERIFICATION SCRIPT
-- Run this to check if everything is set up correctly

-- Check if all tables exist
SELECT 
  'sermon_reactions' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sermon_reactions'
  ) as exists
UNION ALL
SELECT 
  'sermon_bookmarks',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sermon_bookmarks'
  )
UNION ALL
SELECT 
  'sermon_notes',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sermon_notes'
  )
UNION ALL
SELECT 
  'sermon_views',
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sermon_views'
  );

-- Check if sermons table has new columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sermons'
AND column_name IN ('is_featured', 'view_count');

-- Check RLS policies
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename IN ('sermon_reactions', 'sermon_bookmarks', 'sermon_notes', 'sermon_views')
ORDER BY tablename, policyname;

-- Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('sermon_views', 'sermon_notes')
ORDER BY event_object_table, trigger_name;
