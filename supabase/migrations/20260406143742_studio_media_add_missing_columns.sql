-- studio_media: code queries duration, media_url, published_at, series (text)
-- DB has duration_seconds, file_url, recording_date, series_id (FK)

ALTER TABLE studio_media
  ADD COLUMN IF NOT EXISTS duration TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS series TEXT;
-- Backfill media_url from file_url for existing rows
UPDATE studio_media SET media_url = file_url WHERE media_url IS NULL AND file_url IS NOT NULL;
-- Backfill published_at from created_at for published rows
UPDATE studio_media SET published_at = created_at WHERE published_at IS NULL AND status = 'published';
