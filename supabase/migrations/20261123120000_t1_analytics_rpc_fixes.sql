-- T1 — the five *_optimized analytics functions (pre-production scope, user
-- decision 2026-11-23). Callers were already guarded to the caller's own
-- church in Phase 5 (public wrappers → private.assert_own_church); the
-- private bodies failed for every call:
--  * 42883 "character varying = uuid": every tenant_id column is varchar while
--    the parameter is uuid (dashboard / member / financial / activity feed).
--  * Gift totals summed EVERY status (pending, failed, cancelled — and since
--    G7b, member-declared gifts awaiting confirmation). Now confirmed only.
--  * Top donors showed "Unknown" for member gifts (no donor_name): now the
--    member's name; anonymous gifts stay anonymous.
--  * Performance metrics read non-existent pg_stat_user_indexes columns
--    (tablename / indexname → relname / indexrelname).
-- SECURITY (found while testing): private.assert_own_church let ANY signed-in
-- account without a staff row through for ANY church — for them
-- get_staff_tenant_id() is NULL, so `NOT (false OR uuid = NULL)` is NULL and
-- the IF never raised. Only these five wrappers use it; no data leaked
-- because the bodies crashed. Fixed below (NULL now means "not allowed");
-- a scan of all 35 identity-checking functions found no other such check.
-- Result JSON shapes are unchanged. search_path pinned to '' with qualified
-- names. Wrappers / grants unchanged. Rollback: re-create the previous bodies
-- (recorded in docs/recovery/rollback/ if needed; they never returned data).

CREATE OR REPLACE FUNCTION private.assert_own_church(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF (p_tenant_id IS NOT NULL
      AND (private.is_platform_super_admin()
           OR p_tenant_id::text = (private.get_staff_tenant_id())::text)) IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: analytics are only available for your own church' USING ERRCODE = '42501';
  END IF;
END $fn$;

CREATE OR REPLACE FUNCTION private.get_dashboard_stats_optimized_impl(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  t text := p_tenant_id::text;
  member_count int; active_member_count int; event_count int; upcoming_event_count int;
  total_giving numeric; monthly_giving numeric; service_count int; recent_activity_count int;
BEGIN
  SELECT count(*) FILTER (WHERE status IS NOT NULL), count(*) FILTER (WHERE status = 'active')
    INTO member_count, active_member_count FROM public.members WHERE tenant_id = t;
  SELECT count(*) FILTER (WHERE is_published), count(*) FILTER (WHERE is_published AND event_date >= current_date)
    INTO event_count, upcoming_event_count FROM public.events WHERE tenant_id = t;
  SELECT coalesce(sum(amount), 0), coalesce(sum(amount) FILTER (WHERE given_at >= date_trunc('month', current_date)), 0)
    INTO total_giving, monthly_giving FROM public.giving_records
   WHERE tenant_id = t AND payment_status = 'confirmed';
  SELECT count(*) INTO service_count FROM public.services WHERE tenant_id = t AND is_published;
  SELECT count(*) INTO recent_activity_count FROM public.activity_log
   WHERE tenant_id = t AND created_at >= current_date - interval '7 days';
  RETURN json_build_object(
    'members', json_build_object('total', coalesce(member_count, 0), 'active', coalesce(active_member_count, 0),
      'growth_rate', CASE WHEN member_count > 0 THEN round(active_member_count::numeric / member_count * 100, 1) ELSE 0 END),
    'events', json_build_object('total', coalesce(event_count, 0), 'upcoming', coalesce(upcoming_event_count, 0)),
    'giving', json_build_object('total', coalesce(total_giving, 0), 'monthly', coalesce(monthly_giving, 0), 'currency', 'KES'),
    'services', json_build_object('total', coalesce(service_count, 0)),
    'activity', json_build_object('recent_count', coalesce(recent_activity_count, 0)),
    'generated_at', extract(epoch FROM now()));
END $fn$;

CREATE OR REPLACE FUNCTION private.get_financial_analytics_optimized_impl(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE t text := p_tenant_id::text; giving_trends json; giving_by_type json; top_donors json;
BEGIN
  SELECT json_agg(json_build_object('month', to_char(month, 'YYYY-MM'), 'amount', total_amount,
                                    'transactions', transaction_count, 'donors', unique_donors) ORDER BY month)
    INTO giving_trends
    FROM (SELECT date_trunc('month', given_at) AS month, sum(amount) AS total_amount, count(*) AS transaction_count,
                 count(DISTINCT member_id) AS unique_donors
            FROM public.giving_records
           WHERE tenant_id = t AND payment_status = 'confirmed' AND given_at >= current_date - interval '12 months'
           GROUP BY 1) m;

  SELECT json_agg(json_build_object('type', giving_type, 'amount', total_amount, 'transactions', transaction_count,
                                    'percentage', percentage) ORDER BY total_amount DESC)
    INTO giving_by_type
    FROM (SELECT giving_type, sum(amount) AS total_amount, count(*) AS transaction_count,
                 round(sum(amount) / nullif(sum(sum(amount)) OVER (), 0) * 100, 1) AS percentage
            FROM public.giving_records
           WHERE tenant_id = t AND payment_status = 'confirmed' AND given_at >= current_date - interval '12 months'
           GROUP BY giving_type) g;

  SELECT json_agg(json_build_object('donor', donor_display_name, 'amount', total_amount, 'transactions', transaction_count)
                  ORDER BY total_amount DESC)
    INTO top_donors
    FROM (SELECT CASE WHEN coalesce(gr.is_anonymous, false) THEN 'Anonymous Donor'
                      ELSE coalesce(nullif(btrim(concat_ws(' ', m.first_name, m.last_name)), ''), gr.donor_name, 'Unknown') END
                   AS donor_display_name,
                 sum(gr.amount) AS total_amount, count(*) AS transaction_count
            FROM public.giving_records gr
            LEFT JOIN public.members m ON m.id = gr.member_id AND m.tenant_id = gr.tenant_id
           WHERE gr.tenant_id = t AND gr.payment_status = 'confirmed' AND gr.given_at >= current_date - interval '12 months'
           GROUP BY 1 ORDER BY 2 DESC LIMIT 10) d;

  RETURN json_build_object('trends', coalesce(giving_trends, '[]'::json), 'by_type', coalesce(giving_by_type, '[]'::json),
                           'top_donors', coalesce(top_donors, '[]'::json), 'generated_at', extract(epoch FROM now()));
END $fn$;

CREATE OR REPLACE FUNCTION private.get_member_analytics_optimized_impl(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE t text := p_tenant_id::text; member_growth json; member_demographics json; member_engagement json;
BEGIN
  SELECT json_agg(json_build_object('month', to_char(month, 'YYYY-MM'), 'new_members', new_members) ORDER BY month)
    INTO member_growth
    FROM (SELECT date_trunc('month', created_at) AS month, count(*) AS new_members
            FROM public.members WHERE tenant_id = t AND created_at >= current_date - interval '12 months'
           GROUP BY 1) g;
  SELECT json_agg(json_build_object('status', status, 'count', cnt, 'percentage', percentage) ORDER BY cnt DESC)
    INTO member_demographics
    FROM (SELECT status, count(*) AS cnt, round(count(*)::numeric / sum(count(*)) OVER () * 100, 1) AS percentage
            FROM public.members WHERE tenant_id = t GROUP BY status) d;
  SELECT json_agg(json_build_object('level', engagement_level, 'count', cnt))
    INTO member_engagement
    FROM (SELECT CASE WHEN portal_last_seen >= current_date - interval '7 days' THEN 'highly_active'
                      WHEN portal_last_seen >= current_date - interval '30 days' THEN 'active'
                      WHEN portal_last_seen >= current_date - interval '90 days' THEN 'low_active'
                      ELSE 'inactive' END AS engagement_level, count(*) AS cnt
            FROM public.members WHERE tenant_id = t GROUP BY 1) e;
  RETURN json_build_object('growth', coalesce(member_growth, '[]'::json), 'demographics', coalesce(member_demographics, '[]'::json),
                           'engagement', coalesce(member_engagement, '[]'::json), 'generated_at', extract(epoch FROM now()));
END $fn$;

CREATE OR REPLACE FUNCTION private.get_activity_feed_optimized_impl(p_tenant_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE t text := p_tenant_id::text; activity_data json; total_count int;
BEGIN
  SELECT count(*) INTO total_count FROM public.activity_log WHERE tenant_id = t;
  SELECT json_agg(json_build_object('id', id, 'action_type', action_type, 'description', description,
                                    'actor_name', actor_name, 'actor_avatar_url', actor_avatar_url,
                                    'entity_type', entity_type, 'entity_name', entity_name,
                                    'created_at', created_at, 'metadata', metadata) ORDER BY created_at DESC)
    INTO activity_data
    FROM (SELECT * FROM public.activity_log WHERE tenant_id = t ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset) a;
  RETURN json_build_object('data', coalesce(activity_data, '[]'::json),
    'pagination', json_build_object('total', total_count, 'limit', p_limit, 'offset', p_offset,
                                    'has_more', (p_offset + p_limit) < total_count),
    'generated_at', extract(epoch FROM now()));
END $fn$;

CREATE OR REPLACE FUNCTION private.get_performance_metrics_optimized_impl(p_tenant_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE t text := p_tenant_id::text; table_sizes json; index_usage json;
BEGIN
  SELECT json_agg(json_build_object('table', table_name, 'rows', row_count, 'size', size))
    INTO table_sizes
    FROM (SELECT 'members' AS table_name, (SELECT count(*) FROM public.members WHERE tenant_id = t) AS row_count,
                 pg_size_pretty(pg_total_relation_size('public.members'::regclass)) AS size
          UNION ALL
          SELECT 'events', (SELECT count(*) FROM public.events WHERE tenant_id = t),
                 pg_size_pretty(pg_total_relation_size('public.events'::regclass))
          UNION ALL
          SELECT 'giving_records', (SELECT count(*) FROM public.giving_records WHERE tenant_id = t),
                 pg_size_pretty(pg_total_relation_size('public.giving_records'::regclass))) s;
  SELECT json_agg(json_build_object('table', relname, 'index', indexrelname, 'reads', idx_tup_read, 'fetches', idx_tup_fetch))
    INTO index_usage
    FROM (SELECT relname, indexrelname, idx_tup_read, idx_tup_fetch
            FROM pg_catalog.pg_stat_user_indexes
           WHERE schemaname = 'public' AND relname IN ('members', 'events', 'giving_records', 'activity_log')
           ORDER BY idx_tup_read DESC LIMIT 10) i;
  RETURN json_build_object('table_sizes', coalesce(table_sizes, '[]'::json), 'index_usage', coalesce(index_usage, '[]'::json),
                           'generated_at', extract(epoch FROM now()));
END $fn$;

REVOKE ALL ON FUNCTION private.get_dashboard_stats_optimized_impl(uuid), private.get_financial_analytics_optimized_impl(uuid),
  private.get_member_analytics_optimized_impl(uuid), private.get_activity_feed_optimized_impl(uuid, integer, integer),
  private.get_performance_metrics_optimized_impl(uuid) FROM PUBLIC, anon, authenticated;
