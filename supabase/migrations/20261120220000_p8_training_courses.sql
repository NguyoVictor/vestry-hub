-- Recovery Phase 8 — Finding 20 (non-AI part): course publishing + member access.
-- Verified on staging 2026-11-20 (training_courses, course_enrollments and
-- lesson_completions all EMPTY):
--  * The member portal code reads a `course_lessons` table that does not exist,
--    and course_enrollments.member_id / progress_percentage and
--    lesson_completions.member_id / lesson_id / tenant_id that do not exist →
--    every member training page errors.
--  * training_courses had one FOR ALL staff policy → members can never see a
--    published course; course_enrollments / lesson_completions policies keyed
--    on user_id = auth.uid() with NOT NULL legacy columns the app never sends.
-- This migration aligns the schema with the (consistent) app code, adds
-- server-side progress tracking and church-scoped RLS:
--   staff read; writes need can_write_permission(<church>, 'groups_ministries');
--   portal members (member_auth_memberships) read PUBLISHED courses + lessons
--   of their church and manage only THEIR OWN enrollments/completions.
-- Additive; no data modified (tables empty). Rollback: drop course_lessons and
-- the added columns/policies/triggers below.

-- ── Lessons ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id varchar NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'text'
    CHECK (content_type IN ('text', 'video', 'audio', 'pdf', 'image', 'flashcards', 'quiz')),
  content text,
  video_url text,
  audio_url text,
  image_url text,
  thumbnail_url text,
  flashcards jsonb,
  estimated_duration text,
  has_quiz boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON public.course_lessons (course_id, order_index);
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

-- ── Enrollments / completions: columns the app uses ─────────────────────────
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS member_id varchar REFERENCES public.members(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS progress_percentage integer NOT NULL DEFAULT 0;
ALTER TABLE public.course_enrollments ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.course_enrollments ALTER COLUMN user_id SET DEFAULT (auth.uid())::text;
CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_course_member_key ON public.course_enrollments (course_id, member_id);

ALTER TABLE public.lesson_completions
  ADD COLUMN IF NOT EXISTS member_id varchar REFERENCES public.members(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lesson_id varchar REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tenant_id varchar REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_completions ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.lesson_completions ALTER COLUMN module_index DROP NOT NULL;
ALTER TABLE public.lesson_completions ALTER COLUMN lesson_index DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS lesson_completions_lesson_member_key ON public.lesson_completions (lesson_id, member_id);

-- Fill the legacy enrollment link from (course, member); lesson must belong to the course.
CREATE OR REPLACE FUNCTION private.lesson_completion_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NEW.lesson_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.course_lessons l WHERE l.id = NEW.lesson_id AND l.course_id = NEW.course_id) THEN
    RAISE EXCEPTION 'Lesson does not belong to this course' USING ERRCODE = '23514';
  END IF;
  IF NEW.enrollment_id IS NULL THEN
    SELECT e.id INTO NEW.enrollment_id FROM public.course_enrollments e
     WHERE e.course_id = NEW.course_id AND e.member_id = NEW.member_id;
    IF NEW.enrollment_id IS NULL THEN
      RAISE EXCEPTION 'Enroll in the course first' USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION private.lesson_completion_fill() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS lesson_completion_fill ON public.lesson_completions;
CREATE TRIGGER lesson_completion_fill BEFORE INSERT ON public.lesson_completions
  FOR EACH ROW EXECUTE FUNCTION private.lesson_completion_fill();

-- Progress is computed server-side (members cannot write their own percentage).
CREATE OR REPLACE FUNCTION private.course_progress_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE total int; done int;
BEGIN
  SELECT count(*) INTO total FROM public.course_lessons WHERE course_id = NEW.course_id;
  SELECT count(*) INTO done FROM public.lesson_completions
   WHERE course_id = NEW.course_id AND member_id = NEW.member_id;
  UPDATE public.course_enrollments
     SET progress_percentage = CASE WHEN total > 0 THEN least(100, (done * 100) / total) ELSE 0 END,
         completed_at = CASE WHEN total > 0 AND done >= total THEN coalesce(completed_at, now()) ELSE completed_at END
   WHERE course_id = NEW.course_id AND member_id = NEW.member_id;
  RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION private.course_progress_refresh() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS course_progress_refresh ON public.lesson_completions;
CREATE TRIGGER course_progress_refresh AFTER INSERT ON public.lesson_completions
  FOR EACH ROW EXECUTE FUNCTION private.course_progress_refresh();

-- ── RLS ──────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS training_tenant_rls ON public.training_courses;
DROP POLICY IF EXISTS "Users can manage their own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can manage their own lesson completions" ON public.lesson_completions;

DO $p8$
DECLARE t text;
  staff_read text := '(private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text)';
  w text := 'private.can_write_permission((tenant_id)::text, ''groups_ministries'')';
BEGIN
  FOREACH t IN ARRAY ARRAY['training_courses', 'course_lessons'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p8_staff_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', t || '_p8_staff_read', t, staff_read);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p8_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', t || '_p8_insert', t, w);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p8_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t || '_p8_update', t, w, w);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p8_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', t || '_p8_delete', t, w);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['course_enrollments', 'lesson_completions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_p8_staff_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', t || '_p8_staff_read', t, staff_read);
  END LOOP;
END
$p8$;

DROP POLICY IF EXISTS training_courses_p8_member_read ON public.training_courses;
CREATE POLICY training_courses_p8_member_read ON public.training_courses FOR SELECT TO authenticated
  USING (status = 'published' AND private.member_has_tenant((tenant_id)::varchar));
DROP POLICY IF EXISTS course_lessons_p8_member_read ON public.course_lessons;
CREATE POLICY course_lessons_p8_member_read ON public.course_lessons FOR SELECT TO authenticated
  USING (private.member_has_tenant((tenant_id)::varchar)
         AND EXISTS (SELECT 1 FROM public.training_courses c
                      WHERE c.id = course_lessons.course_id AND c.status = 'published'));

-- Members: only their OWN enrollment / completion rows (portal link), only for
-- published courses of their church.
DROP POLICY IF EXISTS course_enrollments_p8_member_own ON public.course_enrollments;
CREATE POLICY course_enrollments_p8_member_own ON public.course_enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.member_auth_memberships mam
                  WHERE mam.auth_user_id = (SELECT auth.uid())
                    AND (mam.member_id)::text = (course_enrollments.member_id)::text
                    AND (mam.tenant_id)::text = (course_enrollments.tenant_id)::text));
DROP POLICY IF EXISTS course_enrollments_p8_member_enroll ON public.course_enrollments;
CREATE POLICY course_enrollments_p8_member_enroll ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.member_auth_memberships mam
                       WHERE mam.auth_user_id = (SELECT auth.uid())
                         AND (mam.member_id)::text = (course_enrollments.member_id)::text
                         AND (mam.tenant_id)::text = (course_enrollments.tenant_id)::text)
              AND (user_id)::text = ((SELECT auth.uid()))::text
              AND progress_percentage = 0 AND completed_at IS NULL
              AND EXISTS (SELECT 1 FROM public.training_courses c
                           WHERE c.id = course_enrollments.course_id AND c.status = 'published'
                             AND (c.tenant_id)::text = (course_enrollments.tenant_id)::text));
DROP POLICY IF EXISTS lesson_completions_p8_member_own ON public.lesson_completions;
CREATE POLICY lesson_completions_p8_member_own ON public.lesson_completions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.member_auth_memberships mam
                  WHERE mam.auth_user_id = (SELECT auth.uid())
                    AND (mam.member_id)::text = (lesson_completions.member_id)::text));
DROP POLICY IF EXISTS lesson_completions_p8_member_complete ON public.lesson_completions;
CREATE POLICY lesson_completions_p8_member_complete ON public.lesson_completions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.member_auth_memberships mam
                       WHERE mam.auth_user_id = (SELECT auth.uid())
                         AND (mam.member_id)::text = (lesson_completions.member_id)::text
                         AND (mam.tenant_id)::text = (lesson_completions.tenant_id)::text));
