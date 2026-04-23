-- Enhance surveys table with new columns
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS closing_date date,
  ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS target_group_id varchar,
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Enhance survey_responses with proper tracking columns
ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS time_taken_seconds integer,
  ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES tenants(id) ON DELETE CASCADE;

-- Backfill tenant_id on survey_responses from surveys
UPDATE survey_responses sr
SET tenant_id = s.tenant_id
FROM surveys s
WHERE sr.survey_id = s.id
  AND sr.tenant_id IS NULL;

-- Ensure survey_answers has ALTER TABLE for answer columns
ALTER TABLE survey_answers
  ADD COLUMN IF NOT EXISTS answer_text text,
  ADD COLUMN IF NOT EXISTS answer_options jsonb,
  ADD COLUMN IF NOT EXISTS answer_rating integer,
  ADD COLUMN IF NOT EXISTS answer_boolean boolean;

-- RLS: allow anon to read published surveys (for public survey taking)
DROP POLICY IF EXISTS "surveys_public_read" ON surveys;
CREATE POLICY "surveys_public_read" ON surveys
  FOR SELECT TO anon
  USING (is_published = true);

-- RLS: allow anon to insert survey_responses (public survey taking)
DROP POLICY IF EXISTS "survey_responses_public_insert" ON survey_responses;
CREATE POLICY "survey_responses_public_insert" ON survey_responses
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "survey_responses_public_read" ON survey_responses;
CREATE POLICY "survey_responses_public_read" ON survey_responses
  FOR SELECT TO anon USING (true);

-- RLS: allow anon to insert survey_answers
DROP POLICY IF EXISTS "survey_answers_public_insert" ON survey_answers;
CREATE POLICY "survey_answers_public_insert" ON survey_answers
  FOR INSERT TO anon WITH CHECK (true);

-- Create survey-uploads storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('survey-uploads', 'survey-uploads', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated admins can read
DROP POLICY IF EXISTS "survey_uploads_admin_read" ON storage.objects;
CREATE POLICY "survey_uploads_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'survey-uploads');

DROP POLICY IF EXISTS "survey_uploads_insert" ON storage.objects;
CREATE POLICY "survey_uploads_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'survey-uploads');;
