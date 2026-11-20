-- Recovery Phase 5 — E1 cross-church isolation audit (staging, 2026-11-20).
--
-- Found with an impersonation matrix (member A, staff A, admin A, member B in a
-- rolled-back txn: every public table with tenant_id, count rows of OTHER
-- churches) plus a policy audit for always-true conditions:
--   church_media_items  ALL USING (true) for authenticated + a tautological
--                        "tenant_isolation" (tenant_id = tenant_id via tenants)
--                        → any signed-in user (any church, incl. members) could
--                        read/edit/delete every church's media (2 foreign rows
--                        visible to all four actors)
--   media_albums, media_categories  ALL with the same tautology
--   sermon_archives     ALL USING (true) / WITH CHECK (true) for authenticated
--   church_storage      INSERT WITH CHECK (true); SELECT/UPDATE tautological
--   quiz_answers / quiz_events / quiz_participants  ALL USING (true) for PUBLIC
--                        → anyone on the internet could modify or delete quiz data
--   sermon_reactions    DELETE USING (true) for PUBLIC → anyone could delete all
-- Fix: replace with church-scoped policies (same model as 20261120140000).
-- Media/sermon pages have no isReadOnly gate yet (media deferred for launch);
-- writes use the 'communication_tools' key. Idempotent; no data modified.
-- Not changed (reviewed, intended): storage_plans public catalogue,
-- website_consultation_requests insert, website_reviews read.

DROP POLICY IF EXISTS authenticated_access ON public.church_media_items;
DROP POLICY IF EXISTS tenant_isolation ON public.church_media_items;
DROP POLICY IF EXISTS media_albums_all ON public.media_albums;
DROP POLICY IF EXISTS media_categories_all ON public.media_categories;
DROP POLICY IF EXISTS authenticated_access_sermon_archives ON public.sermon_archives;
DROP POLICY IF EXISTS church_storage_insert ON public.church_storage;
DROP POLICY IF EXISTS church_storage_select ON public.church_storage;
DROP POLICY IF EXISTS church_storage_update ON public.church_storage;

DO $p5b$
DECLARE
  r record;
  staff_read text;
  write_expr text;
  c text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('church_media_items', 'tenant', 'communication_tools', 'iud'),
      ('media_albums',       'tenant', 'communication_tools', 'iud'),
      ('media_categories',   'tenant', 'communication_tools', 'iud'),
      ('sermon_archives',    'staff',  'communication_tools', 'iud'),
      ('church_storage',     'staff',  'staff',               'iu')
    ) AS v(tbl, rd, wr, ops)
  LOOP
    c := '(tenant_id)::text';
    staff_read := format('(private.is_platform_super_admin() OR %s = (private.get_staff_tenant_id())::text)', c);
    write_expr := CASE r.wr WHEN 'staff' THEN staff_read
                  ELSE format('private.can_write_permission(%s, %L)', c, r.wr) END;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p5_read', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', r.tbl || '_p5_read', r.tbl,
                   CASE r.rd WHEN 'tenant' THEN format('private.actor_has_tenant(%s)', c) ELSE staff_read END);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p5_insert', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', r.tbl || '_p5_insert', r.tbl, write_expr);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p5_update', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', r.tbl || '_p5_update', r.tbl, write_expr, write_expr);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p5_delete', r.tbl);
    IF position('d' in r.ops) > 0 THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', r.tbl || '_p5_delete', r.tbl, write_expr);
    END IF;
  END LOOP;
END
$p5b$;

-- Live quizzes: anonymous players join/answer by join code, so SELECT/INSERT
-- stay public. No client deletes anything; only players update their own
-- participant row (score). Remove public DELETE everywhere and public UPDATE
-- on answers/events. INSERTs must reference an existing session.
-- Accepted gap (documented): anonymous players cannot be bound to their row,
-- so participant UPDATE remains open (game-score tampering only).
DROP POLICY IF EXISTS quiz_answers_all ON public.quiz_answers;
DROP POLICY IF EXISTS quiz_events_all ON public.quiz_events;
DROP POLICY IF EXISTS quiz_participants_all ON public.quiz_participants;
DROP POLICY IF EXISTS quiz_answers_p5_read ON public.quiz_answers;
DROP POLICY IF EXISTS quiz_answers_p5_insert ON public.quiz_answers;
DROP POLICY IF EXISTS quiz_events_p5_read ON public.quiz_events;
DROP POLICY IF EXISTS quiz_events_p5_insert ON public.quiz_events;
DROP POLICY IF EXISTS quiz_participants_p5_read ON public.quiz_participants;
DROP POLICY IF EXISTS quiz_participants_p5_insert ON public.quiz_participants;
DROP POLICY IF EXISTS quiz_participants_p5_update ON public.quiz_participants;
CREATE POLICY quiz_answers_p5_read ON public.quiz_answers FOR SELECT TO public USING (true);
CREATE POLICY quiz_answers_p5_insert ON public.quiz_answers FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions s WHERE s.id = quiz_answers.session_id));
CREATE POLICY quiz_events_p5_read ON public.quiz_events FOR SELECT TO public USING (true);
CREATE POLICY quiz_events_p5_insert ON public.quiz_events FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions s WHERE s.id = quiz_events.session_id));
CREATE POLICY quiz_participants_p5_read ON public.quiz_participants FOR SELECT TO public USING (true);
CREATE POLICY quiz_participants_p5_insert ON public.quiz_participants FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions s WHERE s.id = quiz_participants.session_id));
CREATE POLICY quiz_participants_p5_update ON public.quiz_participants FOR UPDATE TO public
  USING (true)
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_sessions s WHERE s.id = quiz_participants.session_id));

-- Sermon reactions: members may delete only their OWN reaction.
DROP POLICY IF EXISTS "Anyone can delete their own reactions" ON public.sermon_reactions;
DROP POLICY IF EXISTS sermon_reactions_p5_delete_own ON public.sermon_reactions;
CREATE POLICY sermon_reactions_p5_delete_own ON public.sermon_reactions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.members m
                  WHERE (m.id)::text = (sermon_reactions.member_id)::text
                    AND m.user_id = (SELECT auth.uid())::text));
