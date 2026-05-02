-- Song Library UI Revamp: Usage Analytics Functions
-- Migration for usage tracking, trending algorithms, and smart recommendations
-- Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7

-- =====================================================
-- Function: Get Usage Reports (Monthly/Yearly)
-- =====================================================

CREATE OR REPLACE FUNCTION get_usage_reports(
  p_tenant_id VARCHAR,
  p_report_type VARCHAR, -- 'monthly' or 'yearly'
  p_period_count INTEGER DEFAULT 12
)
RETURNS TABLE (
  period TEXT,
  total_usage BIGINT,
  unique_songs BIGINT,
  top_song_title TEXT,
  top_song_artist TEXT,
  top_song_usage BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_report_type = 'monthly' THEN
    RETURN QUERY
    WITH monthly_stats AS (
      SELECT 
        TO_CHAR(used_at, 'YYYY-MM') as report_period,
        COUNT(*) as usage_count,
        COUNT(DISTINCT song_id) as unique_song_count,
        song_id,
        ROW_NUMBER() OVER (PARTITION BY TO_CHAR(used_at, 'YYYY-MM') ORDER BY COUNT(*) DESC) as song_rank
      FROM song_usage_analytics sua
      INNER JOIN songs s ON sua.song_id = s.id
      WHERE sua.tenant_id = p_tenant_id
        AND used_at >= (CURRENT_DATE - INTERVAL '1 month' * p_period_count)
      GROUP BY TO_CHAR(used_at, 'YYYY-MM'), song_id, s.title, s.artist
    ),
    period_totals AS (
      SELECT 
        report_period,
        SUM(usage_count) as total_usage,
        MAX(unique_song_count) as unique_songs
      FROM monthly_stats
      GROUP BY report_period
    ),
    top_songs AS (
      SELECT 
        ms.report_period,
        s.title as song_title,
        s.artist as song_artist,
        ms.usage_count
      FROM monthly_stats ms
      INNER JOIN songs s ON ms.song_id = s.id
      WHERE ms.song_rank = 1
    )
    SELECT 
      pt.report_period,
      pt.total_usage,
      pt.unique_songs,
      COALESCE(ts.song_title, 'No songs') as top_song_title,
      COALESCE(ts.song_artist, '') as top_song_artist,
      COALESCE(ts.usage_count, 0) as top_song_usage
    FROM period_totals pt
    LEFT JOIN top_songs ts ON pt.report_period = ts.report_period
    ORDER BY pt.report_period DESC;
    
  ELSE -- yearly
    RETURN QUERY
    WITH yearly_stats AS (
      SELECT 
        TO_CHAR(used_at, 'YYYY') as report_period,
        COUNT(*) as usage_count,
        COUNT(DISTINCT song_id) as unique_song_count,
        song_id,
        ROW_NUMBER() OVER (PARTITION BY TO_CHAR(used_at, 'YYYY') ORDER BY COUNT(*) DESC) as song_rank
      FROM song_usage_analytics sua
      INNER JOIN songs s ON sua.song_id = s.id
      WHERE sua.tenant_id = p_tenant_id
        AND used_at >= (CURRENT_DATE - INTERVAL '1 year' * p_period_count)
      GROUP BY TO_CHAR(used_at, 'YYYY'), song_id, s.title, s.artist
    ),
    period_totals AS (
      SELECT 
        report_period,
        SUM(usage_count) as total_usage,
        MAX(unique_song_count) as unique_songs
      FROM yearly_stats
      GROUP BY report_period
    ),
    top_songs AS (
      SELECT 
        ys.report_period,
        s.title as song_title,
        s.artist as song_artist,
        ys.usage_count
      FROM yearly_stats ys
      INNER JOIN songs s ON ys.song_id = s.id
      WHERE ys.song_rank = 1
    )
    SELECT 
      pt.report_period,
      pt.total_usage,
      pt.unique_songs,
      COALESCE(ts.song_title, 'No songs') as top_song_title,
      COALESCE(ts.song_artist, '') as top_song_artist,
      COALESCE(ts.usage_count, 0) as top_song_usage
    FROM period_totals pt
    LEFT JOIN top_songs ts ON pt.report_period = ts.report_period
    ORDER BY pt.report_period DESC;
  END IF;
END;
$$;

-- =====================================================
-- Function: Update Trending Songs Status
-- =====================================================

CREATE OR REPLACE FUNCTION update_trending_songs(p_tenant_id VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trending_threshold NUMERIC := 10.0; -- Minimum trending score
BEGIN
  -- First, reset all trending flags
  UPDATE songs 
  SET is_trending = FALSE 
  WHERE tenant_id = p_tenant_id;

  -- Calculate trending scores and update trending songs
  WITH trending_calculations AS (
    SELECT 
      s.id,
      s.title,
      s.artist,
      -- Recent usage (last 7 days)
      COALESCE(recent.usage_count, 0) as recent_usage,
      -- Previous usage (8-30 days ago)
      COALESCE(previous.usage_count, 0) as previous_usage,
      -- Total usage count
      COALESCE(s.usage_count, 0) as total_usage,
      -- Days since last use
      CASE 
        WHEN s.last_played_at IS NULL THEN 999
        ELSE EXTRACT(DAYS FROM (NOW() - s.last_played_at))
      END as days_since_last_use,
      -- Calculate trending score
      (
        -- Base score from recent usage
        COALESCE(recent.usage_count, 0) * 10 +
        -- Growth bonus
        CASE 
          WHEN COALESCE(previous.usage_count, 0) > 0 AND COALESCE(recent.usage_count, 0) > COALESCE(previous.usage_count, 0)
          THEN ((COALESCE(recent.usage_count, 0) - COALESCE(previous.usage_count, 0))::NUMERIC / COALESCE(previous.usage_count, 1)) * 20
          ELSE 0
        END +
        -- Popularity bonus
        LN(COALESCE(s.usage_count, 0) + 1) * 5 -
        -- Recency penalty
        CASE 
          WHEN s.last_played_at IS NULL THEN 60
          WHEN EXTRACT(DAYS FROM (NOW() - s.last_played_at)) > 7 
          THEN LEAST(EXTRACT(DAYS FROM (NOW() - s.last_played_at)) - 7, 30) * 2
          ELSE 0
        END
      ) as trending_score
    FROM songs s
    LEFT JOIN (
      -- Recent usage (last 7 days)
      SELECT 
        song_id,
        COUNT(*) as usage_count
      FROM song_usage_analytics
      WHERE tenant_id = p_tenant_id
        AND used_at >= (NOW() - INTERVAL '7 days')
      GROUP BY song_id
    ) recent ON s.id = recent.song_id
    LEFT JOIN (
      -- Previous usage (8-30 days ago)
      SELECT 
        song_id,
        COUNT(*) as usage_count
      FROM song_usage_analytics
      WHERE tenant_id = p_tenant_id
        AND used_at >= (NOW() - INTERVAL '30 days')
        AND used_at < (NOW() - INTERVAL '7 days')
      GROUP BY song_id
    ) previous ON s.id = previous.song_id
    WHERE s.tenant_id = p_tenant_id
  )
  UPDATE songs 
  SET is_trending = TRUE
  FROM trending_calculations tc
  WHERE songs.id = tc.id
    AND tc.trending_score >= trending_threshold;

  -- Log the update
  INSERT INTO activity_log (tenant_id, action, details, created_at)
  VALUES (
    p_tenant_id,
    'trending_songs_updated',
    jsonb_build_object(
      'threshold', trending_threshold,
      'updated_at', NOW()
    ),
    NOW()
  );
END;
$$;

-- =====================================================
-- Function: Get Smart Song Recommendations
-- =====================================================

CREATE OR REPLACE FUNCTION get_song_recommendations(
  p_tenant_id VARCHAR,
  p_service_type VARCHAR DEFAULT NULL,
  p_current_setlist VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
  p_time_of_day VARCHAR DEFAULT NULL,
  p_season VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id VARCHAR,
  title VARCHAR,
  artist VARCHAR,
  key VARCHAR,
  bpm INTEGER,
  cover_art_url TEXT,
  cover_art_colors JSONB,
  usage_count INTEGER,
  last_played_at TIMESTAMPTZ,
  is_trending BOOLEAN,
  recommendation_score NUMERIC,
  recommendation_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH song_scores AS (
    SELECT 
      s.*,
      (
        -- Base popularity score
        COALESCE(s.usage_count, 0) * 2 +
        
        -- Trending bonus
        CASE WHEN s.is_trending THEN 15 ELSE 0 END +
        
        -- Service type matching bonus
        CASE 
          WHEN p_service_type IS NOT NULL THEN
            COALESCE((
              SELECT COUNT(*) * 5
              FROM song_usage_analytics sua
              WHERE sua.song_id = s.id
                AND sua.service_type = p_service_type
                AND sua.used_at >= (NOW() - INTERVAL '90 days')
            ), 0)
          ELSE 0
        END +
        
        -- Recency bonus (songs used recently but not too recently)
        CASE 
          WHEN s.last_played_at IS NULL THEN -10
          WHEN s.last_played_at >= (NOW() - INTERVAL '7 days') THEN -5 -- Don't repeat too soon
          WHEN s.last_played_at >= (NOW() - INTERVAL '30 days') THEN 10 -- Good recency
          WHEN s.last_played_at >= (NOW() - INTERVAL '90 days') THEN 5  -- Moderate recency
          ELSE -5 -- Too old
        END +
        
        -- Key compatibility bonus (if current setlist has songs)
        CASE 
          WHEN array_length(p_current_setlist, 1) > 0 AND s.key IS NOT NULL THEN
            COALESCE((
              SELECT COUNT(*) * 3
              FROM songs cs
              WHERE cs.id = ANY(p_current_setlist)
                AND cs.key IS NOT NULL
                AND (
                  cs.key = s.key OR -- Same key
                  -- Related keys (circle of fifths)
                  (cs.key, s.key) IN (
                    ('C', 'G'), ('G', 'C'), ('G', 'D'), ('D', 'G'),
                    ('D', 'A'), ('A', 'D'), ('A', 'E'), ('E', 'A'),
                    ('E', 'B'), ('B', 'E'), ('F', 'C'), ('C', 'F'),
                    ('Bb', 'F'), ('F', 'Bb'), ('Eb', 'Bb'), ('Bb', 'Eb'),
                    ('Ab', 'Eb'), ('Eb', 'Ab'), ('Db', 'Ab'), ('Ab', 'Db')
                  )
                )
            ), 0)
          ELSE 0
        END +
        
        -- BPM flow bonus (if current setlist has songs)
        CASE 
          WHEN array_length(p_current_setlist, 1) > 0 AND s.bpm IS NOT NULL THEN
            COALESCE((
              SELECT 
                CASE 
                  WHEN ABS(AVG(cs.bpm) - s.bpm) <= 10 THEN 8  -- Very close tempo
                  WHEN ABS(AVG(cs.bpm) - s.bpm) <= 20 THEN 5  -- Close tempo
                  WHEN ABS(AVG(cs.bpm) - s.bpm) <= 40 THEN 2  -- Moderate tempo difference
                  ELSE -2 -- Large tempo jump
                END
              FROM songs cs
              WHERE cs.id = ANY(p_current_setlist)
                AND cs.bpm IS NOT NULL
            ), 0)
          ELSE 0
        END +
        
        -- Random factor for variety (small influence)
        (RANDOM() * 5)
        
      ) as recommendation_score,
      
      -- Generate recommendation reason
      CASE 
        WHEN s.is_trending THEN 'Trending song'
        WHEN s.usage_count > 10 THEN 'Popular choice'
        WHEN s.last_played_at >= (NOW() - INTERVAL '30 days') THEN 'Recently used'
        WHEN s.last_played_at IS NULL OR s.last_played_at < (NOW() - INTERVAL '90 days') THEN 'Haven''t used recently'
        ELSE 'Good fit for service'
      END as recommendation_reason
      
    FROM songs s
    WHERE s.tenant_id = p_tenant_id
      AND (p_current_setlist IS NULL OR s.id != ALL(p_current_setlist)) -- Exclude songs already in setlist
  )
  SELECT 
    ss.id,
    ss.title,
    ss.artist,
    ss.key,
    ss.bpm,
    ss.cover_art_url,
    ss.cover_art_colors,
    ss.usage_count,
    ss.last_played_at,
    ss.is_trending,
    ss.recommendation_score,
    ss.recommendation_reason
  FROM song_scores ss
  ORDER BY ss.recommendation_score DESC, ss.title ASC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- Function: Get Usage Analytics Summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_usage_analytics_summary(p_tenant_id VARCHAR)
RETURNS TABLE (
  total_songs BIGINT,
  total_usage BIGINT,
  trending_songs BIGINT,
  unused_songs BIGINT,
  avg_usage_per_song NUMERIC,
  most_popular_service_type TEXT,
  usage_growth_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      (SELECT COUNT(*) FROM songs WHERE tenant_id = p_tenant_id) as total_songs,
      (SELECT COUNT(*) FROM song_usage_analytics WHERE tenant_id = p_tenant_id) as total_usage,
      (SELECT COUNT(*) FROM songs WHERE tenant_id = p_tenant_id AND is_trending = TRUE) as trending_songs,
      (SELECT COUNT(*) FROM songs WHERE tenant_id = p_tenant_id AND (last_played_at IS NULL OR last_played_at < (NOW() - INTERVAL '90 days'))) as unused_songs
  ),
  service_type_stats AS (
    SELECT 
      service_type,
      COUNT(*) as usage_count,
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
    FROM song_usage_analytics
    WHERE tenant_id = p_tenant_id
      AND service_type IS NOT NULL
    GROUP BY service_type
  ),
  growth_stats AS (
    SELECT 
      (SELECT COUNT(*) FROM song_usage_analytics WHERE tenant_id = p_tenant_id AND used_at >= (NOW() - INTERVAL '30 days')) as recent_usage,
      (SELECT COUNT(*) FROM song_usage_analytics WHERE tenant_id = p_tenant_id AND used_at >= (NOW() - INTERVAL '60 days') AND used_at < (NOW() - INTERVAL '30 days')) as previous_usage
  )
  SELECT 
    s.total_songs,
    s.total_usage,
    s.trending_songs,
    s.unused_songs,
    CASE WHEN s.total_songs > 0 THEN s.total_usage::NUMERIC / s.total_songs ELSE 0 END as avg_usage_per_song,
    COALESCE((SELECT service_type FROM service_type_stats WHERE rank = 1), 'Unknown') as most_popular_service_type,
    CASE 
      WHEN gs.previous_usage > 0 THEN ((gs.recent_usage - gs.previous_usage)::NUMERIC / gs.previous_usage) * 100
      ELSE 0
    END as usage_growth_rate
  FROM stats s
  CROSS JOIN growth_stats gs;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_usage_reports(VARCHAR, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_trending_songs(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_song_recommendations(VARCHAR, VARCHAR, VARCHAR[], VARCHAR, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_usage_analytics_summary(VARCHAR) TO authenticated;