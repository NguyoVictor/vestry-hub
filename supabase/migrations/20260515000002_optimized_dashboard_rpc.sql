-- =====================================================
-- OPTIMIZED DASHBOARD RPC FUNCTIONS
-- =====================================================
-- Replaces multiple individual queries with single optimized RPC calls
-- Based on Martin Kleppmann's principles for reducing query overhead

-- ─── DROP EXISTING FUNCTIONS ─────────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_dashboard_stats_optimized(UUID);
DROP FUNCTION IF EXISTS get_member_stats_optimized(UUID);
DROP FUNCTION IF EXISTS get_financial_stats_optimized(UUID);

-- ─── OPTIMIZED DASHBOARD STATS FUNCTION ──────────────────────────────────────

CREATE OR REPLACE FUNCTION get_dashboard_stats_optimized(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  member_count INTEGER;
  active_member_count INTEGER;
  event_count INTEGER;
  upcoming_event_count INTEGER;
  total_giving DECIMAL;
  monthly_giving DECIMAL;
  service_count INTEGER;
  recent_activity_count INTEGER;
BEGIN
  -- Single query to get member statistics
  SELECT 
    COUNT(*) FILTER (WHERE status IS NOT NULL),
    COUNT(*) FILTER (WHERE status = 'active')
  INTO member_count, active_member_count
  FROM members 
  WHERE tenant_id = p_tenant_id;

  -- Single query to get event statistics
  SELECT 
    COUNT(*) FILTER (WHERE is_published = true),
    COUNT(*) FILTER (WHERE is_published = true AND event_date >= CURRENT_DATE)
  INTO event_count, upcoming_event_count
  FROM events 
  WHERE tenant_id = p_tenant_id;

  -- Single query to get giving statistics
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount) FILTER (WHERE given_at >= date_trunc('month', CURRENT_DATE)), 0)
  INTO total_giving, monthly_giving
  FROM giving_records 
  WHERE tenant_id = p_tenant_id;

  -- Get service count
  SELECT COUNT(*)
  INTO service_count
  FROM services 
  WHERE tenant_id = p_tenant_id 
    AND is_published = true;

  -- Get recent activity count (last 7 days)
  SELECT COUNT(*)
  INTO recent_activity_count
  FROM activity_log 
  WHERE tenant_id = p_tenant_id 
    AND created_at >= CURRENT_DATE - INTERVAL '7 days';

  -- Build result JSON
  result := json_build_object(
    'members', json_build_object(
      'total', COALESCE(member_count, 0),
      'active', COALESCE(active_member_count, 0),
      'growth_rate', CASE 
        WHEN member_count > 0 THEN ROUND((active_member_count::DECIMAL / member_count * 100), 1)
        ELSE 0 
      END
    ),
    'events', json_build_object(
      'total', COALESCE(event_count, 0),
      'upcoming', COALESCE(upcoming_event_count, 0)
    ),
    'giving', json_build_object(
      'total', COALESCE(total_giving, 0),
      'monthly', COALESCE(monthly_giving, 0),
      'currency', 'KES'
    ),
    'services', json_build_object(
      'total', COALESCE(service_count, 0)
    ),
    'activity', json_build_object(
      'recent_count', COALESCE(recent_activity_count, 0)
    ),
    'generated_at', EXTRACT(EPOCH FROM NOW())
  );

  RETURN result;
END;
$$;

-- ─── OPTIMIZED MEMBER ANALYTICS FUNCTION ─────────────────────────────────────

CREATE OR REPLACE FUNCTION get_member_analytics_optimized(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  member_growth JSON;
  member_demographics JSON;
  member_engagement JSON;
BEGIN
  -- Member growth over last 12 months
  WITH monthly_growth AS (
    SELECT 
      date_trunc('month', created_at) as month,
      COUNT(*) as new_members
    FROM members 
    WHERE tenant_id = p_tenant_id 
      AND created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY month
  )
  SELECT json_agg(
    json_build_object(
      'month', to_char(month, 'YYYY-MM'),
      'new_members', new_members
    )
  ) INTO member_growth
  FROM monthly_growth;

  -- Member demographics
  WITH demographics AS (
    SELECT 
      status,
      COUNT(*) as count,
      ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 1) as percentage
    FROM members 
    WHERE tenant_id = p_tenant_id
    GROUP BY status
  )
  SELECT json_agg(
    json_build_object(
      'status', status,
      'count', count,
      'percentage', percentage
    )
  ) INTO member_demographics
  FROM demographics;

  -- Member engagement (based on portal activity)
  WITH engagement AS (
    SELECT 
      CASE 
        WHEN portal_last_seen >= CURRENT_DATE - INTERVAL '7 days' THEN 'highly_active'
        WHEN portal_last_seen >= CURRENT_DATE - INTERVAL '30 days' THEN 'active'
        WHEN portal_last_seen >= CURRENT_DATE - INTERVAL '90 days' THEN 'low_active'
        ELSE 'inactive'
      END as engagement_level,
      COUNT(*) as count
    FROM members 
    WHERE tenant_id = p_tenant_id
    GROUP BY 1
  )
  SELECT json_agg(
    json_build_object(
      'level', engagement_level,
      'count', count
    )
  ) INTO member_engagement
  FROM engagement;

  result := json_build_object(
    'growth', COALESCE(member_growth, '[]'::json),
    'demographics', COALESCE(member_demographics, '[]'::json),
    'engagement', COALESCE(member_engagement, '[]'::json),
    'generated_at', EXTRACT(EPOCH FROM NOW())
  );

  RETURN result;
END;
$$;

-- ─── OPTIMIZED FINANCIAL ANALYTICS FUNCTION ──────────────────────────────────

CREATE OR REPLACE FUNCTION get_financial_analytics_optimized(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  giving_trends JSON;
  giving_by_type JSON;
  top_donors JSON;
BEGIN
  -- Giving trends over last 12 months
  WITH monthly_giving AS (
    SELECT 
      date_trunc('month', given_at) as month,
      SUM(amount) as total_amount,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT member_id) as unique_donors
    FROM giving_records 
    WHERE tenant_id = p_tenant_id 
      AND given_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY date_trunc('month', given_at)
    ORDER BY month
  )
  SELECT json_agg(
    json_build_object(
      'month', to_char(month, 'YYYY-MM'),
      'amount', total_amount,
      'transactions', transaction_count,
      'donors', unique_donors
    )
  ) INTO giving_trends
  FROM monthly_giving;

  -- Giving by type
  WITH giving_types AS (
    SELECT 
      giving_type,
      SUM(amount) as total_amount,
      COUNT(*) as transaction_count,
      ROUND(SUM(amount)::DECIMAL / SUM(SUM(amount)) OVER () * 100, 1) as percentage
    FROM giving_records 
    WHERE tenant_id = p_tenant_id 
      AND given_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY giving_type
  )
  SELECT json_agg(
    json_build_object(
      'type', giving_type,
      'amount', total_amount,
      'transactions', transaction_count,
      'percentage', percentage
    )
  ) INTO giving_by_type
  FROM giving_types;

  -- Top donors (anonymized)
  WITH top_donors_data AS (
    SELECT 
      CASE 
        WHEN is_anonymous = true THEN 'Anonymous Donor'
        ELSE COALESCE(donor_name, 'Unknown')
      END as donor_display_name,
      SUM(amount) as total_amount,
      COUNT(*) as transaction_count
    FROM giving_records 
    WHERE tenant_id = p_tenant_id 
      AND given_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY 1
    ORDER BY total_amount DESC
    LIMIT 10
  )
  SELECT json_agg(
    json_build_object(
      'donor', donor_display_name,
      'amount', total_amount,
      'transactions', transaction_count
    )
  ) INTO top_donors
  FROM top_donors_data;

  result := json_build_object(
    'trends', COALESCE(giving_trends, '[]'::json),
    'by_type', COALESCE(giving_by_type, '[]'::json),
    'top_donors', COALESCE(top_donors, '[]'::json),
    'generated_at', EXTRACT(EPOCH FROM NOW())
  );

  RETURN result;
END;
$$;

-- ─── OPTIMIZED ACTIVITY FEED FUNCTION ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_activity_feed_optimized(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  activity_data JSON;
  total_count INTEGER;
BEGIN
  -- Get total count for pagination
  SELECT COUNT(*)
  INTO total_count
  FROM activity_log
  WHERE tenant_id = p_tenant_id;

  -- Get paginated activity data
  WITH activity_feed AS (
    SELECT 
      id,
      action_type,
      description,
      actor_name,
      actor_avatar_url,
      entity_type,
      entity_name,
      created_at,
      metadata
    FROM activity_log
    WHERE tenant_id = p_tenant_id
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'action_type', action_type,
      'description', description,
      'actor_name', actor_name,
      'actor_avatar_url', actor_avatar_url,
      'entity_type', entity_type,
      'entity_name', entity_name,
      'created_at', created_at,
      'metadata', metadata
    )
  ) INTO activity_data
  FROM activity_feed;

  result := json_build_object(
    'data', COALESCE(activity_data, '[]'::json),
    'pagination', json_build_object(
      'total', total_count,
      'limit', p_limit,
      'offset', p_offset,
      'has_more', (p_offset + p_limit) < total_count
    ),
    'generated_at', EXTRACT(EPOCH FROM NOW())
  );

  RETURN result;
END;
$$;

-- ─── PERFORMANCE MONITORING FUNCTION ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_performance_metrics_optimized(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  table_sizes JSON;
  index_usage JSON;
  query_performance JSON;
BEGIN
  -- Table sizes for this tenant
  WITH table_stats AS (
    SELECT 
      'members' as table_name,
      COUNT(*) as row_count,
      pg_size_pretty(pg_total_relation_size('members')) as size
    FROM members WHERE tenant_id = p_tenant_id
    UNION ALL
    SELECT 
      'events' as table_name,
      COUNT(*) as row_count,
      pg_size_pretty(pg_total_relation_size('events')) as size
    FROM events WHERE tenant_id = p_tenant_id
    UNION ALL
    SELECT 
      'giving_records' as table_name,
      COUNT(*) as row_count,
      pg_size_pretty(pg_total_relation_size('giving_records')) as size
    FROM giving_records WHERE tenant_id = p_tenant_id
  )
  SELECT json_agg(
    json_build_object(
      'table', table_name,
      'rows', row_count,
      'size', size
    )
  ) INTO table_sizes
  FROM table_stats;

  -- Index usage statistics (requires pg_stat_user_indexes)
  WITH index_stats AS (
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_tup_read,
      idx_tup_fetch
    FROM pg_stat_user_indexes 
    WHERE tablename IN ('members', 'events', 'giving_records', 'activity_log')
    ORDER BY idx_tup_read DESC
    LIMIT 10
  )
  SELECT json_agg(
    json_build_object(
      'table', tablename,
      'index', indexname,
      'reads', idx_tup_read,
      'fetches', idx_tup_fetch
    )
  ) INTO index_usage
  FROM index_stats;

  result := json_build_object(
    'table_sizes', COALESCE(table_sizes, '[]'::json),
    'index_usage', COALESCE(index_usage, '[]'::json),
    'generated_at', EXTRACT(EPOCH FROM NOW())
  );

  RETURN result;
END;
$$;

-- ─── GRANT PERMISSIONS ───────────────────────────────────────────────────────

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats_optimized(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_analytics_optimized(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_analytics_optimized(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_feed_optimized(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_metrics_optimized(UUID) TO authenticated;

-- ─── COMMENTS FOR DOCUMENTATION ──────────────────────────────────────────────

COMMENT ON FUNCTION get_dashboard_stats_optimized(UUID) IS 'Optimized dashboard statistics - replaces 8+ individual queries with single RPC call';
COMMENT ON FUNCTION get_member_analytics_optimized(UUID) IS 'Member analytics with growth trends and demographics';
COMMENT ON FUNCTION get_financial_analytics_optimized(UUID) IS 'Financial analytics with giving trends and donor insights';
COMMENT ON FUNCTION get_activity_feed_optimized(UUID, INTEGER, INTEGER) IS 'Paginated activity feed with proper performance optimization';
COMMENT ON FUNCTION get_performance_metrics_optimized(UUID) IS 'Database performance metrics for monitoring and optimization';