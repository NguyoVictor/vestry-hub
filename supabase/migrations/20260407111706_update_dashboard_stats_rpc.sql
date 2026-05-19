CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_member_count INT;
  v_giving_month NUMERIC;
  v_events_week INT;
  v_group_count INT;
  v_month_start DATE;
  v_today DATE;
  v_week_end DATE;
BEGIN
  v_today := CURRENT_DATE;
  v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_week_end := v_today + INTERVAL '7 days';

  -- Count from members table (source of truth for all member types)
  SELECT COUNT(*) INTO v_member_count
  FROM members WHERE tenant_id = p_tenant_id AND status = 'active';

  SELECT COALESCE(SUM(amount), 0) INTO v_giving_month
  FROM giving_records
  WHERE tenant_id = p_tenant_id AND given_at >= v_month_start;

  SELECT COUNT(*) INTO v_events_week
  FROM events
  WHERE tenant_id = p_tenant_id
    AND event_date >= v_today AND event_date <= v_week_end;

  SELECT COUNT(*) INTO v_group_count
  FROM groups WHERE tenant_id = p_tenant_id AND is_active = true;

  RETURN jsonb_build_object(
    'member_count', v_member_count,
    'giving_month', v_giving_month,
    'events_week', v_events_week,
    'group_count', v_group_count
  );
END;
$$;
