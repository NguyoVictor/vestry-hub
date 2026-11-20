-- Recovery Phase 5 — CRITICAL cross-church data exposure (Supabase security
-- advisor, verified read-only on staging 2026-11-20).
--
-- These SECURITY DEFINER functions were EXECUTABLE BY anon AND authenticated
-- and did not check the caller at all. Five take a church id, so anyone on the
-- internet could read any church's dashboard, member, financial, activity and
-- performance analytics (church ids are publicly readable):
--   get_dashboard_stats_optimized(uuid), get_member_analytics_optimized(uuid),
--   get_financial_analytics_optimized(uuid), get_activity_feed_optimized(uuid,int,int),
--   get_performance_metrics_optimized(uuid)
-- Fix: move each original into schema private as <name>_impl (owner-only,
-- search_path pinned), and put a guarded wrapper with the SAME name/arguments
-- in public: only the caller's own church (active staff) or a platform super
-- admin. The dashboard hooks keep calling the same RPC names.
-- Also: cleanup_inactive_collaborations(), update_song_usage_stats(),
-- get_trending_songs(varchar,int) have no browser callers (songs = deferred
-- media) → no longer executable by anon/authenticated.
--
-- Idempotent. Rollback: drop the public wrappers, move private.<name>_impl
-- back to public.<name>, re-grant EXECUTE (NOT recommended: restores the leak).

DO $wrap$
DECLARE
  f record;
BEGIN
  FOR f IN SELECT * FROM (VALUES
    ('get_dashboard_stats_optimized',     'uuid'),
    ('get_member_analytics_optimized',    'uuid'),
    ('get_financial_analytics_optimized', 'uuid'),
    ('get_performance_metrics_optimized', 'uuid'),
    ('get_activity_feed_optimized',       'uuid, integer, integer')
  ) AS v(name, args)
  LOOP
    IF to_regprocedure(format('private.%I(%s)', f.name || '_impl', f.args)) IS NULL THEN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET SCHEMA private', f.name, f.args);
      EXECUTE format('ALTER FUNCTION private.%I(%s) RENAME TO %I', f.name, f.args, f.name || '_impl');
    END IF;
    EXECUTE format('ALTER FUNCTION private.%I(%s) SET search_path = public, pg_temp', f.name || '_impl', f.args);
    EXECUTE format('REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC, anon, authenticated', f.name || '_impl', f.args);
  END LOOP;
END
$wrap$;

CREATE OR REPLACE FUNCTION private.assert_own_church(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF p_tenant_id IS NULL
     OR NOT (private.is_platform_super_admin()
             OR p_tenant_id::text = (private.get_staff_tenant_id())::text) THEN
    RAISE EXCEPTION 'Forbidden: analytics are only available for your own church' USING ERRCODE = '42501';
  END IF;
END;
$fn$;
REVOKE ALL ON FUNCTION private.assert_own_church(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.assert_own_church(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats_optimized(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  PERFORM private.assert_own_church(p_tenant_id);
  RETURN private.get_dashboard_stats_optimized_impl(p_tenant_id);
END; $fn$;

CREATE OR REPLACE FUNCTION public.get_member_analytics_optimized(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  PERFORM private.assert_own_church(p_tenant_id);
  RETURN private.get_member_analytics_optimized_impl(p_tenant_id);
END; $fn$;

CREATE OR REPLACE FUNCTION public.get_financial_analytics_optimized(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  PERFORM private.assert_own_church(p_tenant_id);
  RETURN private.get_financial_analytics_optimized_impl(p_tenant_id);
END; $fn$;

CREATE OR REPLACE FUNCTION public.get_performance_metrics_optimized(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  PERFORM private.assert_own_church(p_tenant_id);
  RETURN private.get_performance_metrics_optimized_impl(p_tenant_id);
END; $fn$;

CREATE OR REPLACE FUNCTION public.get_activity_feed_optimized(p_tenant_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  PERFORM private.assert_own_church(p_tenant_id);
  RETURN private.get_activity_feed_optimized_impl(p_tenant_id, least(greatest(coalesce(p_limit, 20), 1), 100), greatest(coalesce(p_offset, 0), 0));
END; $fn$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats_optimized(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_member_analytics_optimized(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_financial_analytics_optimized(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_performance_metrics_optimized(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_activity_feed_optimized(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_optimized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_analytics_optimized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_analytics_optimized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_metrics_optimized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_feed_optimized(uuid, integer, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.cleanup_inactive_collaborations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_song_usage_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_trending_songs(character varying, integer) FROM PUBLIC, anon, authenticated;
