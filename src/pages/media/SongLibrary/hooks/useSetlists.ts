/**
 * useSetlists Hook for Song Library UI Revamp
 * 
 * Enhanced data fetching hook for setlists with:
 * - TanStack Query integration
 * - Caching and stale-time optimization
 * - Error handling and retry logic
 * - Real-time collaboration support
 * 
 * This is a placeholder implementation - will be enhanced in subsequent tasks.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLES } from '@/lib/schema';
import type { Setlist } from '@/types/song-library';

export function useSetlists(tenantId: string | null) {
  return useQuery({
    queryKey: ['setlists', tenantId],
    queryFn: async (): Promise<Setlist[]> => {
      if (!tenantId) return [];

      // Fetch setlists with their items
      const { data: setlistsData, error: setlistsError } = await supabase
        .from(TABLES.SET_LISTS)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('service_date', { ascending: false });

      if (setlistsError) {
        throw new Error(`Failed to fetch setlists: ${setlistsError.message}`);
      }

      // Fetch setlist items for all setlists
      const setlistIds = setlistsData?.map(s => s.id) || [];
      
      let setlistItems: any[] = [];
      if (setlistIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from(TABLES.SET_LIST_SONGS)
          .select('*')
          .in('set_list_id', setlistIds)
          .order('position');

        if (itemsError) {
          throw new Error(`Failed to fetch setlist items: ${itemsError.message}`);
        }

        setlistItems = itemsData || [];
      }

      // Transform data to match enhanced Setlist interface
      return (setlistsData || []).map(setlist => ({
        ...setlist,
        items: setlistItems
          .filter(item => item.set_list_id === setlist.id)
          .map(item => ({
            ...item,
            setlist_id: item.set_list_id,
          })),
        collaborators: [], // Will be populated from collaboration table in future tasks
        total_duration: undefined, // Will be calculated based on song durations
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export default useSetlists;