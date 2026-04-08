-- training_courses: code expects category, difficulty, status, cover_image_url,
-- target_audience, has_certificate, certificate_title, enrollment_count,
-- total_duration_minutes, instructor_member_id

ALTER TABLE training_courses
  ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'leadership',
  ADD COLUMN IF NOT EXISTS difficulty VARCHAR DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS has_certificate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_title VARCHAR DEFAULT 'Certificate of Completion',
  ADD COLUMN IF NOT EXISTS enrollment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instructor_member_id VARCHAR,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_training_courses_tenant_id ON training_courses(tenant_id);;
