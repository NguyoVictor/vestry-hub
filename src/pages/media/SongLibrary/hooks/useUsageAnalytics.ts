/**
 * useUsageAnalytics Hook for Song Library UI Revamp
 * 
 * Comprehensive usage analytics and smart organization features:
 * - Song usage tracking and analytics collection
 * - Trending song identification algorithms
 * - Usage-based song recommendations
 * - Monthly and yearly usage reports
 * - Unused songs identification and highlighting
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLES, COLS } from '@/lib/schema';
import { toast } from 'sonner';
import type { 
  Song, 
  SongUsageAnalytics, 
  UsageAnalyticsResponse,
  TrackUsageRequest,
  ServiceType 
} from '@/types/song-library';

// =====================================================
// Usage Analytics Data Fetching
// =====================================================

/**
 * Fetch comprehensive usage analytics for songs
 */
export function useUsageAnalytics(tenantId: string | null) {
  return useQuery({
    queryKey: ['usage-analytics', tenantId],
    queryFn: async (): Promise<UsageAnalyticsResponse> => {
      if (!tenantId) {
        return {
          totalUsage: 0,
          trendingPeriod: 'week',
          topSongs: [],
          unusedSongs: [],
          usageByServiceType: {},
        };
      }

      // Fetch usage analytics with song data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from(TABLES.SONG_USAGE_ANALYTICS)
        .select(`
          *,
          ${TABLES.SONGS}!inner (
            id,
            title,
            artist,
            key,
            bpm,
            cover_art_url,
            cover_art_colors,
            usage_count,
            last_played_at,
            is_trending
          )
        `)
        .eq(COLS.TENANT_ID, tenantId)
        .gte(COLS.USAGE_USED_AT, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .order(COLS.USAGE_USED_AT, { ascending: false });

      if (analyticsError) {
        throw new Error(`Failed to fetch usage analytics: ${analyticsError.message}`);
      }

      // Fetch all songs to identify unused ones
      const { data: allSongs, error: songsError } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId);

      if (songsError) {
        throw new Error(`Failed to fetch songs: ${songsError.message}`);
      }

      return processUsageAnalytics(analyticsData || [], allSongs || []);
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Fetch trending songs based on recent usage patterns
 */
export function useTrendingSongs(tenantId: string | null, period: 'week' | 'month' | 'year' = 'week') {
  return useQuery({
    queryKey: ['trending-songs', tenantId, period],
    queryFn: async (): Promise<Song[]> => {
      if (!tenantId) return [];

      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      // Get songs with usage in the specified period
      const { data, error } = await supabase
        .from(TABLES.SONG_USAGE_ANALYTICS)
        .select(`
          song_id,
          count(*) as usage_count,
          ${TABLES.SONGS}!inner (
            id,
            title,
            artist,
            key,
            bpm,
            cover_art_url,
            cover_art_colors,
            usage_count,
            last_played_at,
            is_trending
          )
        `)
        .eq(COLS.TENANT_ID, tenantId)
        .gte(COLS.USAGE_USED_AT, startDate)
        .order('usage_count', { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(`Failed to fetch trending songs: ${error.message}`);
      }

      return (data || []).map(item => ({
        ...item.songs,
        recent_usage_count: item.usage_count,
      }));
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch unused songs that haven't been played recently
 */
export function useUnusedSongs(tenantId: string | null, daysSinceLastUse: number = 90) {
  return useQuery({
    queryKey: ['unused-songs', tenantId, daysSinceLastUse],
    queryFn: async (): Promise<Song[]> => {
      if (!tenantId) return [];

      const cutoffDate = new Date(Date.now() - daysSinceLastUse * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq(COLS.TENANT_ID, tenantId)
        .or(`${COLS.SONG_LAST_PLAYED_AT}.is.null,${COLS.SONG_LAST_PLAYED_AT}.lt.${cutoffDate}`)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch unused songs: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Fetch usage reports for specific time periods
 */
export function useUsageReports(tenantId: string | null, reportType: 'monthly' | 'yearly') {
  return useQuery({
    queryKey: ['usage-reports', tenantId, reportType],
    queryFn: async () => {
      if (!tenantId) return [];

      const isMonthly = reportType === 'monthly';
      const dateFormat = isMonthly ? 'YYYY-MM' : 'YYYY';
      const periodCount = isMonthly ? 12 : 5; // Last 12 months or 5 years

      const { data, error } = await supabase.rpc('get_usage_reports', {
        p_tenant_id: tenantId,
        p_report_type: reportType,
        p_period_count: periodCount,
      });

      if (error) {
        throw new Error(`Failed to fetch usage reports: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// =====================================================
// Usage Tracking Mutations
// =====================================================

/**
 * Track song usage when played in services
 */
export function useTrackUsage(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: TrackUsageRequest) => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Insert usage analytics record
      const { error: analyticsError } = await supabase
        .from(TABLES.SONG_USAGE_ANALYTICS)
        .insert({
          [COLS.TENANT_ID]: tenantId,
          song_id: request.song_id,
          [COLS.USAGE_SERVICE_TYPE]: request.service_type,
          [COLS.USAGE_SETLIST_ID]: request.setlist_id,
          [COLS.USAGE_KEY_USED]: request.key_used,
          [COLS.USAGE_DURATION_PLAYED]: request.duration_played,
          [COLS.USAGE_USED_AT]: new Date().toISOString(),
        });

      if (analyticsError) {
        throw new Error(`Failed to track usage: ${analyticsError.message}`);
      }

      // Update song usage count and last played date
      const { error: songError } = await supabase
        .from(TABLES.SONGS)
        .update({
          [COLS.SONG_USAGE_COUNT]: supabase.raw('usage_count + 1'),
          [COLS.SONG_LAST_PLAYED_AT]: new Date().toISOString(),
        })
        .eq('id', request.song_id)
        .eq(COLS.TENANT_ID, tenantId);

      if (songError) {
        throw new Error(`Failed to update song usage: ${songError.message}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['usage-analytics', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['trending-songs', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['songs', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['song-recommendations', tenantId] });
      
      toast.success('Song usage tracked successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to track song usage:', error);
      toast.error('Failed to track song usage');
    },
  });
}

/**
 * Bulk track usage for multiple songs (e.g., from a setlist)
 */
export function useBulkTrackUsage(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requests: TrackUsageRequest[]) => {
      if (!tenantId || requests.length === 0) {
        throw new Error('Tenant ID and usage requests are required');
      }

      // Prepare analytics records
      const analyticsRecords = requests.map(request => ({
        [COLS.TENANT_ID]: tenantId,
        song_id: request.song_id,
        [COLS.USAGE_SERVICE_TYPE]: request.service_type,
        [COLS.USAGE_SETLIST_ID]: request.setlist_id,
        [COLS.USAGE_KEY_USED]: request.key_used,
        [COLS.USAGE_DURATION_PLAYED]: request.duration_played,
        [COLS.USAGE_USED_AT]: new Date().toISOString(),
      }));

      // Insert all analytics records
      const { error: analyticsError } = await supabase
        .from(TABLES.SONG_USAGE_ANALYTICS)
        .insert(analyticsRecords);

      if (analyticsError) {
        throw new Error(`Failed to track bulk usage: ${analyticsError.message}`);
      }

      // Update usage counts for all songs
      const songIds = requests.map(r => r.song_id);
      const { error: songError } = await supabase
        .from(TABLES.SONGS)
        .update({
          [COLS.SONG_USAGE_COUNT]: supabase.raw('usage_count + 1'),
          [COLS.SONG_LAST_PLAYED_AT]: new Date().toISOString(),
        })
        .in('id', songIds)
        .eq(COLS.TENANT_ID, tenantId);

      if (songError) {
        throw new Error(`Failed to update song usage counts: ${songError.message}`);
      }

      return { success: true, tracked: requests.length };
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['usage-analytics', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['trending-songs', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['songs', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['song-recommendations', tenantId] });
      
      toast.success(`Successfully tracked usage for ${data.tracked} songs`);
    },
    onError: (error: Error) => {
      console.error('Failed to bulk track usage:', error);
      toast.error('Failed to track song usage');
    },
  });
}

/**
 * Update trending status for songs based on usage patterns
 */
export function useUpdateTrendingStatus(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Call stored procedure to update trending status
      const { error } = await supabase.rpc('update_trending_songs', {
        p_tenant_id: tenantId,
      });

      if (error) {
        throw new Error(`Failed to update trending status: ${error.message}`);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['trending-songs', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['usage-analytics', tenantId] });
    },
  });
}

// =====================================================
// Smart Song Recommendations
// =====================================================

/**
 * Get smart song recommendations based on usage patterns
 */
export function useSongRecommendations(tenantId: string | null, context?: {
  serviceType?: ServiceType;
  currentSetlist?: string[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  season?: 'spring' | 'summer' | 'fall' | 'winter';
}) {
  return useQuery({
    queryKey: ['song-recommendations', tenantId, context],
    queryFn: async (): Promise<Song[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase.rpc('get_song_recommendations', {
        p_tenant_id: tenantId,
        p_service_type: context?.serviceType,
        p_current_setlist: context?.currentSetlist || [],
        p_time_of_day: context?.timeOfDay,
        p_season: context?.season,
        p_limit: 20,
      });

      if (error) {
        throw new Error(`Failed to fetch recommendations: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Process raw usage analytics data into structured response
 */
function processUsageAnalytics(
  analyticsData: any[],
  allSongs: Song[]
): UsageAnalyticsResponse {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Group usage by song
  const songUsageMap = new Map<string, {
    song: Song;
    usageCount: number;
    lastUsed: string;
    recentUsage: number;
    previousUsage: number;
  }>();

  // Process analytics data
  analyticsData.forEach(record => {
    const songId = record.song_id;
    const usedAt = new Date(record.used_at);
    
    if (!songUsageMap.has(songId)) {
      songUsageMap.set(songId, {
        song: record.songs,
        usageCount: 0,
        lastUsed: record.used_at,
        recentUsage: 0,
        previousUsage: 0,
      });
    }

    const songData = songUsageMap.get(songId)!;
    songData.usageCount++;
    
    if (usedAt > new Date(songData.lastUsed)) {
      songData.lastUsed = record.used_at;
    }

    // Count recent vs previous usage for trend calculation
    if (usedAt >= oneWeekAgo) {
      songData.recentUsage++;
    } else if (usedAt >= oneMonthAgo) {
      songData.previousUsage++;
    }
  });

  // Calculate top songs with trends
  const topSongs = Array.from(songUsageMap.values())
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 20)
    .map(songData => {
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (songData.recentUsage > songData.previousUsage) {
        trend = 'up';
      } else if (songData.recentUsage < songData.previousUsage) {
        trend = 'down';
      }

      return {
        song: songData.song,
        usageCount: songData.usageCount,
        lastUsed: songData.lastUsed,
        trend,
      };
    });

  // Find unused songs
  const usedSongIds = new Set(songUsageMap.keys());
  const unusedSongs = allSongs.filter(song => !usedSongIds.has(song.id));

  // Calculate usage by service type
  const usageByServiceType: Record<string, number> = {};
  analyticsData.forEach(record => {
    const serviceType = record.service_type || 'unknown';
    usageByServiceType[serviceType] = (usageByServiceType[serviceType] || 0) + 1;
  });

  return {
    totalUsage: analyticsData.length,
    trendingPeriod: 'week',
    topSongs,
    unusedSongs,
    usageByServiceType,
  };
}

/**
 * Calculate trending score for a song based on usage patterns
 */
export function calculateTrendingScore(
  recentUsage: number,
  previousUsage: number,
  totalUsage: number,
  daysSinceLastUse: number
): number {
  // Base score from recent usage
  let score = recentUsage * 10;

  // Boost for increasing usage trend
  if (recentUsage > previousUsage) {
    const growthRate = previousUsage > 0 ? (recentUsage - previousUsage) / previousUsage : 1;
    score += growthRate * 20;
  }

  // Penalty for decreasing usage
  if (recentUsage < previousUsage && previousUsage > 0) {
    const declineRate = (previousUsage - recentUsage) / previousUsage;
    score -= declineRate * 15;
  }

  // Boost for overall popularity
  score += Math.log(totalUsage + 1) * 5;

  // Penalty for not being used recently
  if (daysSinceLastUse > 7) {
    score -= Math.min(daysSinceLastUse - 7, 30) * 2;
  }

  return Math.max(0, score);
}

export default useUsageAnalytics;