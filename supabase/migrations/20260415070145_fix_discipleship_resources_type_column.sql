-- Give the legacy type column a default so it never blocks inserts
ALTER TABLE discipleship_resources ALTER COLUMN type SET DEFAULT 'document';
-- Backfill any nulls that might exist
UPDATE discipleship_resources SET type = 'document' WHERE type IS NULL;;
