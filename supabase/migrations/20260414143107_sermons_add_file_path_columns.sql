ALTER TABLE sermons
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS audio_file_path TEXT,
  ADD COLUMN IF NOT EXISTS doc_file_path TEXT;
