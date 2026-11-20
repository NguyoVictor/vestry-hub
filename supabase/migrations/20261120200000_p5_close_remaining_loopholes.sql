-- Recovery Phase 5 — close the remaining loopholes (user instruction 2026-11-20).
-- Verified read-only on staging xwbajophstetbnnemsyq.
--
-- 1. Live quiz scores: players wrote their own score/coins/streak with a
--    public UPDATE on quiz_participants (anyone could set any score). Scores
--    are now derived in the database from each inserted answer; public UPDATE
--    removed (host = church staff may still update). One answer per player per
--    question; points per answer capped. Solo-mode answers (session_id NULL)
--    stay allowed. (quiz_answers/participants were empty on staging.)
-- 2. volunteer_hours: portal members can read ONLY their own hours.
-- 3. Secrets readable by every staff member of a church (E5):
--      tenants.{at_api_key, whatsapp_access_token, payhero_credential_id,
--               daraja_consumer_key, daraja_consumer_secret, daraja_passkey}
--      sms_settings.at_api_key
--      branches.branch_password_hash (unsalted SHA-256 computed in-browser)
--    Browsers can no longer SELECT these columns (writes are unchanged, so
--    admins can still set/rotate them; server functions use service_role).
--    NOTE for future migrations: tenants/sms_settings/branches now use
--    column-level SELECT grants for authenticated — a NEW column must be
--    granted explicitly (src/lib/tenantColumns.ts + contract test).
-- Idempotent. Rollback: GRANT SELECT ON <table> TO authenticated; drop the
-- quiz trigger/function/constraints/policies below.

-- ── 1. Quiz scoring server-side ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.quiz_apply_answer_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  UPDATE public.quiz_participants p
     SET score  = coalesce(p.score, 0) + coalesce(NEW.points_earned, 0),
         coins  = coalesce(p.coins, 0) + floor(coalesce(NEW.points_earned, 0) / 100),
         streak = CASE WHEN NEW.is_correct THEN coalesce(p.streak, 0) + 1 ELSE 0 END
   WHERE p.id = NEW.participant_id;
  RETURN NULL;
END;
$fn$;
REVOKE ALL ON FUNCTION private.quiz_apply_answer_score() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS quiz_answers_apply_score ON public.quiz_answers;
CREATE TRIGGER quiz_answers_apply_score AFTER INSERT ON public.quiz_answers
  FOR EACH ROW EXECUTE FUNCTION private.quiz_apply_answer_score();

DO $q$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.quiz_answers'::regclass
                  AND conname = 'quiz_answers_points_range') THEN
    ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_points_range
      CHECK (points_earned IS NULL OR (points_earned >= 0 AND points_earned <= 10000));
  END IF;
END
$q$;
CREATE UNIQUE INDEX IF NOT EXISTS quiz_answers_one_per_question
  ON public.quiz_answers (participant_id, question_index);

DROP POLICY IF EXISTS quiz_answers_p5_insert ON public.quiz_answers;
CREATE POLICY quiz_answers_p5_insert ON public.quiz_answers FOR INSERT TO public
  WITH CHECK (session_id IS NULL
              OR EXISTS (SELECT 1 FROM public.quiz_sessions s WHERE s.id = quiz_answers.session_id));

DROP POLICY IF EXISTS quiz_participants_p5_update ON public.quiz_participants;
DROP POLICY IF EXISTS quiz_participants_p5_staff_update ON public.quiz_participants;
CREATE POLICY quiz_participants_p5_staff_update ON public.quiz_participants FOR UPDATE TO authenticated
  USING (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text)
  WITH CHECK (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text);

-- ── 2. volunteer_hours: members read their own ──────────────────────────────
DROP POLICY IF EXISTS volunteer_hours_p5_member_own_read ON public.volunteer_hours;
CREATE POLICY volunteer_hours_p5_member_own_read ON public.volunteer_hours FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.member_auth_memberships mam
                  WHERE mam.auth_user_id = (SELECT auth.uid())
                    AND (mam.member_id)::text = (volunteer_hours.volunteer_member_id)::text
                    AND (mam.tenant_id)::text = (volunteer_hours.tenant_id)::text));

-- ── 3. Secret columns: no browser SELECT ────────────────────────────────────
DO $sec$
DECLARE
  spec record;
  cols text;
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('tenants',      ARRAY['at_api_key','whatsapp_access_token','payhero_credential_id',
                           'daraja_consumer_key','daraja_consumer_secret','daraja_passkey']),
    ('sms_settings', ARRAY['at_api_key']),
    ('branches',     ARRAY['branch_password_hash'])
  ) AS v(tbl, secret_cols)
  LOOP
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = spec.tbl
       AND NOT (column_name = ANY (spec.secret_cols));
    EXECUTE format('REVOKE SELECT ON public.%I FROM authenticated', spec.tbl);
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', cols, spec.tbl);
    -- anon: only narrow if it currently has TABLE-level SELECT (never widen).
    IF spec.tbl <> 'tenants' AND has_table_privilege('anon', format('public.%I', spec.tbl), 'SELECT') THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', spec.tbl);
      EXECUTE format('GRANT SELECT (%s) ON public.%I TO anon', cols, spec.tbl);
    END IF;
  END LOOP;
END
$sec$;
