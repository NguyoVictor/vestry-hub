-- T2 — Live multiplayer quiz, server-side game (pre-production scope, user
-- decision 2026-11-23). Before: no way to author a quiz (table empty, builder
-- "coming soon"), the launch dialog offered hard-coded fake quizzes and wrote
-- non-existent columns (game_pin/host_id/course_id), players could not read a
-- session by PIN (staff-only RLS), the join wrote a non-existent member_id,
-- and the player screens would have downloaded the whole answer key.
--
-- Model:
--  * quizzes: authored by church staff holding 'groups_ministries' (same key as
--    Training courses, Phase 8). Members/anon cannot read them (answer key).
--    Questions are validated on save.
--  * quiz_sessions: created ONLY by quiz_host_create_session(), which freezes a
--    copy of the questions. Host control ONLY via quiz_host_control().
--  * Players join with the PIN + a nickname (no account needed): quiz_join()
--    returns a random player token (only its SHA-256 is stored). Every player
--    call presents (participant id, token). Players receive the current
--    question WITHOUT the correct answer; the correct answer is revealed only
--    after the host reveals. Answers are scored on the server (correctness +
--    speed, within the question's deadline); the Phase 5 trigger adds points.
--  * The public read/insert policies on quiz_participants / quiz_answers /
--    quiz_events are removed: browsers can no longer write game rows directly.
-- quizzes / quiz_sessions / quiz_participants / quiz_answers were empty on
-- staging when this was written. Rollback: drop the functions + columns below
-- and restore the previous policies from 20261120170000 / 20261120200000.

-- ── Schema ─────────────────────────────────────────────────────────────────
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'lobby',
  ADD COLUMN IF NOT EXISTS question_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS questions_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quiz_title text;
DO $c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_sessions_phase_check') THEN
    ALTER TABLE public.quiz_sessions ADD CONSTRAINT quiz_sessions_phase_check
      CHECK (phase IN ('lobby','question','reveal','leaderboard','ended'));
  END IF;
END $c$;
ALTER TABLE public.quiz_participants ADD COLUMN IF NOT EXISTS player_token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS quiz_participants_session_name_key
  ON public.quiz_participants (session_id, lower(display_name));

-- ── Question validation ────────────────────────────────────────────────────
-- Format: [{ "text": str, "options": [str x2..4], "correct_index": int,
--            "time_limit": 5..120 (s), "points": 100..2000 }]  (1..50 questions)
CREATE OR REPLACE FUNCTION private.quiz_questions_valid(p jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $fn$
DECLARE q jsonb; n int;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(p) < 1 OR jsonb_array_length(p) > 50 THEN RETURN false; END IF;
  FOR q IN SELECT * FROM jsonb_array_elements(p) LOOP
    IF jsonb_typeof(q) <> 'object' OR jsonb_typeof(q->'text') <> 'string'
       OR length(btrim(q->>'text')) NOT BETWEEN 1 AND 300
       OR jsonb_typeof(q->'options') <> 'array' THEN RETURN false; END IF;
    n := jsonb_array_length(q->'options');
    IF n < 2 OR n > 4 THEN RETURN false; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(q->'options') o
                WHERE jsonb_typeof(o) <> 'string' OR length(btrim(o #>> '{}')) NOT BETWEEN 1 AND 120) THEN RETURN false; END IF;
    IF jsonb_typeof(q->'correct_index') <> 'number' OR (q->>'correct_index')::numeric <> floor((q->>'correct_index')::numeric)
       OR (q->>'correct_index')::int NOT BETWEEN 0 AND n - 1 THEN RETURN false; END IF;
    IF jsonb_typeof(q->'time_limit') <> 'number' OR (q->>'time_limit')::numeric NOT BETWEEN 5 AND 120 THEN RETURN false; END IF;
    IF jsonb_typeof(q->'points') <> 'number' OR (q->>'points')::numeric NOT BETWEEN 100 AND 2000 THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION private.quizzes_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT private.quiz_questions_valid(NEW.questions) THEN
    RAISE EXCEPTION 'Each quiz needs 1–50 questions, each with text, 2–4 answers, one correct answer, a 5–120 s time limit and 100–2000 points.'
      USING ERRCODE = '22023';
  END IF;
  NEW.num_questions := jsonb_array_length(NEW.questions);
  NEW.updated_at := now();
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS quizzes_validate ON public.quizzes;
CREATE TRIGGER quizzes_validate BEFORE INSERT OR UPDATE OF questions ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION private.quizzes_validate();

-- ── RLS ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS quizzes_tenant_rls ON public.quizzes;
DROP POLICY IF EXISTS quizzes_t2_staff_read ON public.quizzes;
DROP POLICY IF EXISTS quizzes_t2_insert ON public.quizzes;
DROP POLICY IF EXISTS quizzes_t2_update ON public.quizzes;
DROP POLICY IF EXISTS quizzes_t2_delete ON public.quizzes;
CREATE POLICY quizzes_t2_staff_read ON public.quizzes FOR SELECT TO authenticated
  USING (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text);
CREATE POLICY quizzes_t2_insert ON public.quizzes FOR INSERT TO authenticated
  WITH CHECK ((tenant_id)::text = (private.get_staff_tenant_id())::text
              AND private.can_write_permission((tenant_id)::text, 'groups_ministries'));
CREATE POLICY quizzes_t2_update ON public.quizzes FOR UPDATE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'groups_ministries'))
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'groups_ministries'));
CREATE POLICY quizzes_t2_delete ON public.quizzes FOR DELETE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'groups_ministries'));

DROP POLICY IF EXISTS quiz_sessions_tenant ON public.quiz_sessions;
DROP POLICY IF EXISTS quiz_sessions_t2_staff_read ON public.quiz_sessions;
CREATE POLICY quiz_sessions_t2_staff_read ON public.quiz_sessions FOR SELECT TO authenticated
  USING (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text);

DROP POLICY IF EXISTS quiz_participants_p5_read ON public.quiz_participants;
DROP POLICY IF EXISTS quiz_participants_p5_insert ON public.quiz_participants;
DROP POLICY IF EXISTS quiz_participants_t2_staff_read ON public.quiz_participants;
CREATE POLICY quiz_participants_t2_staff_read ON public.quiz_participants FOR SELECT TO authenticated
  USING (private.is_platform_super_admin() OR (tenant_id)::text = (private.get_staff_tenant_id())::text);

DROP POLICY IF EXISTS quiz_answers_p5_read ON public.quiz_answers;
DROP POLICY IF EXISTS quiz_answers_p5_insert ON public.quiz_answers;
DROP POLICY IF EXISTS quiz_answers_t2_staff_read ON public.quiz_answers;
CREATE POLICY quiz_answers_t2_staff_read ON public.quiz_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions s WHERE s.id = quiz_answers.session_id
                  AND (private.is_platform_super_admin() OR (s.tenant_id)::text = (private.get_staff_tenant_id())::text)));

DROP POLICY IF EXISTS quiz_events_p5_read ON public.quiz_events;
DROP POLICY IF EXISTS quiz_events_p5_insert ON public.quiz_events;
DROP POLICY IF EXISTS quiz_events_t2_staff_read ON public.quiz_events;
CREATE POLICY quiz_events_t2_staff_read ON public.quiz_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quiz_sessions s WHERE s.id = quiz_events.session_id
                  AND (private.is_platform_super_admin() OR (s.tenant_id)::text = (private.get_staff_tenant_id())::text)));

-- ── Helpers ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.quiz_token_hash(p_token text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$fn$;

-- The player row for (session, participant, token) or NULL.
CREATE OR REPLACE FUNCTION private.quiz_player(p_session_id text, p_participant_id text, p_token text)
RETURNS public.quiz_participants LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT p.* FROM public.quiz_participants p
   WHERE p.id = p_participant_id AND p.session_id = p_session_id AND NOT coalesce(p.is_host, false)
     AND p.player_token_hash IS NOT NULL
     AND p.player_token_hash = private.quiz_token_hash(p_token)
   LIMIT 1;
$fn$;

-- Seconds left on the current question (0 when closed).
CREATE OR REPLACE FUNCTION private.quiz_seconds_left(s public.quiz_sessions)
RETURNS numeric LANGUAGE sql STABLE SET search_path = '' AS $fn$
  SELECT CASE WHEN s.phase = 'question' AND s.question_started_at IS NOT NULL THEN
    greatest(0, round(((s.questions_snapshot -> s.current_question_index ->> 'time_limit')::numeric
                       - extract(epoch FROM (now() - s.question_started_at)))::numeric, 1))
  ELSE 0 END;
$fn$;

CREATE OR REPLACE FUNCTION private.quiz_leaderboard(p_session_id text, p_limit int)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'rank')::int, x->>'display_name'), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('id', p.id, 'display_name', p.display_name, 'avatar_emoji', p.avatar_emoji,
             'score', coalesce(p.score, 0), 'streak', coalesce(p.streak, 0),
             'rank', rank() OVER (ORDER BY coalesce(p.score, 0) DESC),
             'joined_at', p.joined_at,
             'correct', (SELECT count(*) FROM public.quiz_answers a WHERE a.participant_id = p.id AND a.is_correct),
             'answered', (SELECT count(*) FROM public.quiz_answers a WHERE a.participant_id = p.id)) AS x
      FROM public.quiz_participants p
     WHERE p.session_id = p_session_id AND NOT coalesce(p.is_host, false)
     ORDER BY coalesce(p.score, 0) DESC, p.joined_at
     LIMIT greatest(p_limit, 0)
  ) t;
$fn$;

-- Question as players see it (never includes the answer).
CREATE OR REPLACE FUNCTION private.quiz_public_question(s public.quiz_sessions)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $fn$
  SELECT CASE WHEN s.phase IN ('question','reveal','leaderboard') THEN
    jsonb_build_object('text', s.questions_snapshot -> s.current_question_index ->> 'text',
                       'options', s.questions_snapshot -> s.current_question_index -> 'options',
                       'time_limit', (s.questions_snapshot -> s.current_question_index ->> 'time_limit')::int,
                       'points', (s.questions_snapshot -> s.current_question_index ->> 'points')::int)
  END;
$fn$;

-- ── Player API (anon + authenticated) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.quiz_join(p_code text, p_display_name text, p_avatar text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE s public.quiz_sessions; v_name text; v_token text; v_pid text; v_count int;
BEGIN
  SELECT * INTO s FROM public.quiz_sessions
   WHERE join_code = upper(btrim(coalesce(p_code, ''))) AND status IN ('waiting','active') AND phase <> 'ended'
   LIMIT 1;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Game PIN not found or the game has ended.' USING ERRCODE = 'P0002'; END IF;
  v_name := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
  IF length(v_name) NOT BETWEEN 1 AND 24 THEN RAISE EXCEPTION 'Enter a nickname of 1–24 characters.' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO v_count FROM public.quiz_participants WHERE session_id = s.id;
  IF v_count >= 300 THEN RAISE EXCEPTION 'This game is full.' USING ERRCODE = '53400'; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_participants WHERE session_id = s.id AND lower(display_name) = lower(v_name)) THEN
    RAISE EXCEPTION 'That nickname is taken in this game.' USING ERRCODE = '23505';
  END IF;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.quiz_participants(session_id, display_name, avatar_emoji, score, coins, streak, is_host, tenant_id, player_token_hash)
  VALUES (s.id, v_name, left(coalesce(nullif(btrim(p_avatar), ''), '🙂'), 8), 0, 0, 0, false, s.tenant_id, private.quiz_token_hash(v_token))
  RETURNING id INTO v_pid;
  RETURN jsonb_build_object('session_id', s.id, 'participant_id', v_pid, 'token', v_token);
END $fn$;

CREATE OR REPLACE FUNCTION public.quiz_player_state(p_session_id text, p_participant_id text, p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE s public.quiz_sessions; me public.quiz_participants; a public.quiz_answers; v_rank int; v_total int; v_reveal boolean;
BEGIN
  me := private.quiz_player(p_session_id, p_participant_id, p_token);
  IF me.id IS NULL THEN RAISE EXCEPTION 'Not a player in this game.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM public.quiz_sessions WHERE id = p_session_id;
  v_reveal := s.phase IN ('reveal','leaderboard','ended');
  SELECT * INTO a FROM public.quiz_answers WHERE participant_id = me.id AND question_index = s.current_question_index;
  SELECT r.rnk, r.total INTO v_rank, v_total FROM (
    SELECT p.id, rank() OVER (ORDER BY coalesce(p.score, 0) DESC) rnk, count(*) OVER () total
      FROM public.quiz_participants p WHERE p.session_id = s.id AND NOT coalesce(p.is_host, false)) r
   WHERE r.id = me.id;
  RETURN jsonb_build_object(
    'status', s.status, 'phase', s.phase, 'quiz_title', s.quiz_title,
    'question_index', s.current_question_index,
    'total_questions', jsonb_array_length(s.questions_snapshot),
    'question', private.quiz_public_question(s),
    'seconds_left', private.quiz_seconds_left(s),
    'my_answer', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
        'choice', a.answer_given::int,
        'is_correct', CASE WHEN v_reveal THEN a.is_correct END,
        'points', CASE WHEN v_reveal THEN a.points_earned END) END,
    'correct_index', CASE WHEN v_reveal
        THEN (s.questions_snapshot -> s.current_question_index ->> 'correct_index')::int END,
    'me', jsonb_build_object('display_name', me.display_name, 'avatar_emoji', me.avatar_emoji,
        'score', coalesce(me.score, 0), 'streak', coalesce(me.streak, 0), 'rank', v_rank),
    'players', coalesce(v_total, 0),
    'top', CASE WHEN s.phase IN ('leaderboard','ended') THEN private.quiz_leaderboard(s.id, 5) ELSE '[]'::jsonb END);
END $fn$;

CREATE OR REPLACE FUNCTION public.quiz_submit_answer(p_session_id text, p_participant_id text, p_token text,
                                                     p_question_index int, p_choice int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE s public.quiz_sessions; me public.quiz_participants; q jsonb; v_elapsed numeric; v_limit numeric;
        v_correct boolean; v_points int; v_id text;
BEGIN
  me := private.quiz_player(p_session_id, p_participant_id, p_token);
  IF me.id IS NULL THEN RAISE EXCEPTION 'Not a player in this game.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM public.quiz_sessions WHERE id = p_session_id FOR SHARE;
  IF s.phase <> 'question' OR s.current_question_index <> p_question_index THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'closed');
  END IF;
  q := s.questions_snapshot -> s.current_question_index;
  v_limit := (q->>'time_limit')::numeric;
  v_elapsed := extract(epoch FROM (now() - s.question_started_at));
  IF v_elapsed > v_limit + 1.5 THEN RETURN jsonb_build_object('accepted', false, 'reason', 'time_up'); END IF;
  IF p_choice IS NULL OR p_choice < 0 OR p_choice >= jsonb_array_length(q->'options') THEN
    RAISE EXCEPTION 'Invalid answer.' USING ERRCODE = '22023';
  END IF;
  v_correct := p_choice = (q->>'correct_index')::int;
  -- Correct answers earn 50–100 % of the question's points, faster = more.
  v_points := CASE WHEN v_correct THEN
    round((q->>'points')::numeric * (1 - 0.5 * least(greatest(v_elapsed, 0), v_limit) / v_limit))::int ELSE 0 END;
  INSERT INTO public.quiz_answers(session_id, participant_id, question_index, answer_given, is_correct, time_taken_ms, points_earned)
  VALUES (s.id, me.id, s.current_question_index, p_choice::text, v_correct, round(greatest(v_elapsed, 0) * 1000)::int, v_points)
  ON CONFLICT (participant_id, question_index) DO NOTHING
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('accepted', v_id IS NOT NULL, 'reason', CASE WHEN v_id IS NULL THEN 'already_answered' END);
END $fn$;

-- ── Host API (church staff with groups_ministries) ─────────────────────────
CREATE OR REPLACE FUNCTION private.quiz_assert_host(p_tenant_id text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF NOT (private.is_platform_super_admin()
          OR ((private.get_staff_tenant_id())::text = p_tenant_id AND private.can_write_permission(p_tenant_id, 'groups_ministries'))) THEN
    RAISE EXCEPTION 'Only church staff who manage training can host a live quiz.' USING ERRCODE = '42501';
  END IF;
END $fn$;

CREATE OR REPLACE FUNCTION public.quiz_host_create_session(p_quiz_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE z public.quizzes; v_code text; v_id text; i int := 0;
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  SELECT * INTO z FROM public.quizzes WHERE id = p_quiz_id;
  IF z.id IS NULL THEN RAISE EXCEPTION 'Quiz not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM private.quiz_assert_host((z.tenant_id)::text);
  IF NOT private.quiz_questions_valid(z.questions) THEN RAISE EXCEPTION 'This quiz has no valid questions yet.' USING ERRCODE = '22023'; END IF;
  LOOP
    i := i + 1;
    v_code := (SELECT string_agg(substr(chars, 1 + floor(random() * length(chars))::int, 1), '') FROM generate_series(1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.quiz_sessions WHERE join_code = v_code);
    IF i > 20 THEN RAISE EXCEPTION 'Could not allocate a game PIN, try again.'; END IF;
  END LOOP;
  INSERT INTO public.quiz_sessions(quiz_id, join_code, status, phase, host_user_id, tenant_id, questions_snapshot, quiz_title, current_question_index)
  VALUES (z.id, v_code, 'waiting', 'lobby', (SELECT auth.uid())::text, z.tenant_id, z.questions, z.title, 0)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('session_id', v_id, 'join_code', v_code);
END $fn$;

CREATE OR REPLACE FUNCTION public.quiz_host_control(p_session_id text, p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE s public.quiz_sessions; v_last int;
BEGIN
  SELECT * INTO s FROM public.quiz_sessions WHERE id = p_session_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Game not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM private.quiz_assert_host((s.tenant_id)::text);
  v_last := jsonb_array_length(s.questions_snapshot) - 1;
  IF p_action = 'end' THEN
    UPDATE public.quiz_sessions SET phase = 'ended', status = 'ended', ended_at = now() WHERE id = s.id;
  ELSIF p_action = 'start' AND s.phase = 'lobby' THEN
    UPDATE public.quiz_sessions SET phase = 'question', status = 'active', started_at = now(),
           current_question_index = 0, question_started_at = now() WHERE id = s.id;
  ELSIF p_action = 'reveal' AND s.phase = 'question' THEN
    UPDATE public.quiz_sessions SET phase = 'reveal' WHERE id = s.id;
  ELSIF p_action = 'leaderboard' AND s.phase = 'reveal' THEN
    UPDATE public.quiz_sessions SET phase = 'leaderboard' WHERE id = s.id;
  ELSIF p_action = 'next' AND s.phase IN ('reveal','leaderboard') THEN
    IF s.current_question_index >= v_last THEN
      UPDATE public.quiz_sessions SET phase = 'ended', status = 'ended', ended_at = now() WHERE id = s.id;
    ELSE
      UPDATE public.quiz_sessions SET phase = 'question', current_question_index = s.current_question_index + 1,
             question_started_at = now() WHERE id = s.id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Action "%" is not possible in phase "%".', p_action, s.phase USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.quiz_events(session_id, event_type, payload)
  VALUES (s.id, 'host_' || p_action, jsonb_build_object('from_phase', s.phase, 'question_index', s.current_question_index));
  RETURN public.quiz_host_state(s.id);
END $fn$;

CREATE OR REPLACE FUNCTION public.quiz_host_state(p_session_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE s public.quiz_sessions; q jsonb; v_counts jsonb; v_answered int;
BEGIN
  SELECT * INTO s FROM public.quiz_sessions WHERE id = p_session_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Game not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM private.quiz_assert_host((s.tenant_id)::text);
  q := s.questions_snapshot -> s.current_question_index;
  SELECT coalesce(jsonb_agg(c ORDER BY i), '[]'::jsonb) INTO v_counts FROM (
    SELECT i, (SELECT count(*) FROM public.quiz_answers a
                WHERE a.session_id = s.id AND a.question_index = s.current_question_index AND a.answer_given = i::text) c
      FROM generate_series(0, greatest(jsonb_array_length(coalesce(q->'options', '[]'::jsonb)) - 1, 0)) i) t;
  SELECT count(*) INTO v_answered FROM public.quiz_answers a
   WHERE a.session_id = s.id AND a.question_index = s.current_question_index;
  RETURN jsonb_build_object(
    'session_id', s.id, 'join_code', s.join_code, 'status', s.status, 'phase', s.phase,
    'quiz_title', s.quiz_title, 'question_index', s.current_question_index,
    'total_questions', jsonb_array_length(s.questions_snapshot),
    'question', CASE WHEN s.phase IN ('question','reveal','leaderboard') THEN q END,
    'avg_time_limit', (SELECT round(avg((x->>'time_limit')::numeric)) FROM jsonb_array_elements(s.questions_snapshot) x),
    'seconds_left', private.quiz_seconds_left(s),
    'answered', v_answered, 'answer_counts', v_counts,
    'participants', private.quiz_leaderboard(s.id, 300));
END $fn$;

-- ── Grants ─────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION private.quiz_questions_valid(jsonb), private.quizzes_validate(), private.quiz_token_hash(text),
  private.quiz_player(text, text, text), private.quiz_seconds_left(public.quiz_sessions),
  private.quiz_leaderboard(text, int), private.quiz_public_question(public.quiz_sessions),
  private.quiz_assert_host(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quiz_join(text, text, text), public.quiz_player_state(text, text, text),
  public.quiz_submit_answer(text, text, text, int, int), public.quiz_host_create_session(text),
  public.quiz_host_control(text, text), public.quiz_host_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quiz_join(text, text, text), public.quiz_player_state(text, text, text),
  public.quiz_submit_answer(text, text, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_host_create_session(text), public.quiz_host_control(text, text),
  public.quiz_host_state(text) TO authenticated;
