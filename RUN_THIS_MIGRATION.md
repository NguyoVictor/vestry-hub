# Fix Sermons Table Schema

## Problem
The `sermons` table is missing required columns like `thumbnail_url`, `audio_url`, `video_url`, etc.

## Solution
Run the migration to add all missing columns.

## Steps to Fix

### Option 1: Using Supabase CLI (Recommended)
```bash
# Make sure you're in the project root
npx supabase db push
```

### Option 2: Run SQL Directly in Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `supabase/migrations/20260428000000_add_sermons_columns.sql`
5. Click "Run" to execute the migration

### Option 3: Using psql (if you have direct database access)
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20260428000000_add_sermons_columns.sql
```

## What This Migration Does
- Adds `thumbnail_url`, `thumbnail_path` for sermon images
- Adds `video_url`, `audio_url`, `audio_file_path`, `doc_file_path` for media
- Adds `sermon_type`, `style`, `audience`, `duration` for sermon metadata
- Adds `draft_notes`, `additional_instructions`, `manuscript` for content
- Adds `ai_generated` flag and `status` field
- Adds `sermon_date` for scheduling
- Creates indexes for better query performance

## After Running
1. Refresh your browser
2. Try saving a sermon again
3. The error should be gone!
