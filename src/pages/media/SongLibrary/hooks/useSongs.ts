/**
 * useSongs Hook for Song Library UI Revamp
 * 
 * Enhanced data fetching hook for songs with:
 * - TanStack Query integration
 * - Caching and stale-time optimization
 * - Error handling and retry logic
 * - Real-time updates support
 * 
 * This is a placeholder implementation - will be enhanced in subsequent tasks.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLES } from '@/lib/schema';
import type { Song } from '@/types/song-library';

export function useSongs(tenantId: string | null) {
  return useQuery({
    queryKey: ['songs', tenantId],
    queryFn: async (): Promise<Song[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('title');

      if (error) {
        throw new Error(`Failed to fetch songs: ${error.message}`);
      }

      // Transform data to match enhanced Song interface
      return (data || []).map(song => ({
        ...song,
        tags: song.tags || [],
        usage_count: song.usage_count || 0,
        custom_fields: song.custom_fields || {},
        is_trending: song.is_trending || false,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export default useSongs;