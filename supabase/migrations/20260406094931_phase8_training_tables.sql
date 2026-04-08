-- Course Enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  UNIQUE(course_id, user_id)
);
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own enrollments" ON course_enrollments FOR ALL
  USING (user_id = auth.uid()::text);
CREATE POLICY "Admins can view all enrollments" ON course_enrollments FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);

-- Lesson Completions
CREATE TABLE IF NOT EXISTS lesson_completions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enrollment_id VARCHAR REFERENCES course_enrollments(id) ON DELETE CASCADE NOT NULL,
  course_id VARCHAR REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  module_index INT NOT NULL,
  lesson_index INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(enrollment_id, module_index, lesson_index)
);
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own lesson completions" ON lesson_completions FOR ALL
  USING (enrollment_id IN (SELECT id FROM course_enrollments WHERE user_id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_lesson_completions_enrollment ON lesson_completions(enrollment_id);

-- Course Comments
CREATE TABLE IF NOT EXISTS course_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE course_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled users can view and add comments" ON course_comments FOR ALL
  USING (course_id IN (SELECT course_id FROM course_enrollments WHERE user_id = auth.uid()::text));
CREATE INDEX IF NOT EXISTS idx_course_comments_course ON course_comments(course_id);;
