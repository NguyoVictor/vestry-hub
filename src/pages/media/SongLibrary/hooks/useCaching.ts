import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { songCache, searchCache, preferencesCache, cacheInvalidation, preloader } from '../utils/caching';
import { Song } from '../types';

/**
 * Hook for managing cached song data
 * Validates: Requirements 11.3 (browser storage caching for frequently accessed songs)
 */
export const useCachedSongs = () => {
  const queryClient = useQueryClient();

  const getCachedSong = useCallback((songId: string): Song | null => {
    return songCache.get(songId);
  }, []);

  const setCachedSong = useCallback((song: Song) => {
    songCache.set(song.id, song);
  }, []);

  const invalidateSong = useCallback((songId: string) => {
    cacheInvalidation.invalidateSong(songId);
    queryClient.invalidateQueries({ queryKey: ['songs', songId] });
  }, [queryClient]);

  const invalidateAllSongs = useCallback(() => {
    cacheInvalidation.invalidateAllSongs();
    queryClient.invalidateQueries({ queryKey: ['songs'] });
  }, [queryClient]);

  return {
    getCachedSong,
    setCachedSong,
    invalidateSong,
    invalidateAllSongs,
  };
};

/**
 * Hook for managing cached search results
 */
export const useCachedSearch = () => {
  const getCachedResults = useCallback((query: string, filters?: any) => {
    const cacheKey = JSON.stringify({ query, filters });
    return searchCache.get(cacheKey);
  }, []);

  const setCachedResults = useCallback((query: string, filters: any, results: any) => {
    const cacheKey = JSON.stringify({ query, filters });
    searchCache.set(cacheKey, results);
  }, []);

  const invalidateSearch = useCallback(() => {
    cacheInvalidation.invalidateSearch();
  }, []);

  return {
    getCachedResults,
    setCachedResults,
    invalidateSearch,
  };
};

/**
 * Hook for managing user preferences cache
 */
export const useCachedPreferences = () => {
  const getCachedPreferences = useCallback((userId: string) => {
    return preferencesCache.get(userId);
  }, []);

  const setCachedPreferences = useCallback((userId: string, preferences: any) => {
    preferencesCache.set(userId, preferences);
  }, []);

  return {
    getCachedPreferences,
    setCachedPreferences,
  };
};

/**
 * Hook for preloading critical data and components
 */
export const usePreloader = () => {
  const preloadPopularSongs = useCallback(async (
    songIds: string[], 
    fetchFn: (id: string) => Promise<Song>
  ) => {
    await preloader.preloadPopularSongs(songIds, fetchFn);
  }, []);

  const preloadCoverArt = useCallback(async (imageUrls: string[]) => {
    await preloader.preloadCoverArt(imageUrls);
  }, []);

  const preloadComponents = useCallback(async () => {
    await preloader.preloadComponents();
  }, []);

  return {
    preloadPopularSongs,
    preloadCoverArt,
    preloadComponents,
  };
};

/**
 * Hook for optimized song fetching with caching
 */
export const useOptimizedSongQuery = (songId: string, fetchFn: (id: string) => Promise<Song>) => {
  const { getCachedSong, setCachedSong } = useCachedSongs();

  return useQuery({
    queryKey: ['songs', songId],
    queryFn: async () => {
      // Check cache first
      const cached = getCachedSong(songId);
      if (cached) {
        return cached;
      }

      // Fetch from API and cache result
      const song = await fetchFn(songId);
      setCachedSong(song);
      return song;
    },
    staleTime: 300_000, // 5 minutes
    gcTime: 600_000, // 10 minutes
  });
};

/**
 * Hook for optimized search with caching
 */
export const useOptimizedSearch = (
  query: string,
  filters: any,
  searchFn: (query: string, filters: any) => Promise<any>
) => {
  const { getCachedResults, setCachedResults } = useCachedSearch();

  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: async () => {
      // Check cache first
      const cached = getCachedResults(query, filters);
      if (cached) {
        return cached;
      }

      // Fetch from API and cache result
      const results = await searchFn(query, filters);
      setCachedResults(query, filters, results);
      return results;
    },
    enabled: query.length > 0,
    staleTime: 300_000, // 5 minutes
    gcTime: 600_000, // 10 minutes
  });
};

/**
 * Hook for cache warming on component mount
 */
export const useCacheWarming = (
  popularSongIds: string[],
  recentSearches: string[],
  fetchSong: (id: string) => Promise<Song>,
  searchFn: (query: string) => Promise<any>
) => {
  const { preloadPopularSongs } = usePreloader();
  const { setCachedResults } = useCachedSearch();

  useEffect(() => {
    const warmCache = async () => {
      try {
        // Preload popular songs
        if (popularSongIds.length > 0) {
          await preloadPopularSongs(popularSongIds, fetchSong);
        }

        // Preload recent search results
        const searchPromises = recentSearches.slice(0, 5).map(async (query) => {
          try {
            const results = await searchFn(query);
            setCachedResults(query, {}, results);
          } catch (error) {
            console.warn(`Failed to warm cache for search: ${query}`, error);
          }
        });

        await Promise.allSettled(searchPromises);
      } catch (error) {
        console.warn('Cache warming failed:', error);
      }
    };

    // Warm cache after a short delay to not block initial render
    const timeoutId = setTimeout(warmCache, 1000);
    return () => clearTimeout(timeoutId);
  }, [popularSongIds, recentSearches, preloadPopularSongs, fetchSong, searchFn, setCachedResults]);
};

/**
 * Hook for cache refresh mechanisms
 */
export const useCacheRefresh = () => {
  const queryClient = useQueryClient();
  const { invalidateAllSongs, invalidateSong } = useCachedSongs();
  const { invalidateSearch } = useCachedSearch();

  const refreshSongCache = useCallback(async (songId?: string) => {
    if (songId) {
      invalidateSong(songId);
      await queryClient.refetchQueries({ queryKey: ['songs', songId] });
    } else {
      invalidateAllSongs();
      await queryClient.refetchQueries({ queryKey: ['songs'] });
    }
  }, [queryClient, invalidateSong, invalidateAllSongs]);

  const refreshSearchCache = useCallback(async () => {
    invalidateSearch();
    await queryClient.refetchQueries({ queryKey: ['search'] });
  }, [queryClient, invalidateSearch]);

  const refreshAllCaches = useCallback(async () => {
    invalidateAllSongs();
    invalidateSearch();
    await queryClient.refetchQueries();
  }, [queryClient, invalidateAllSongs, invalidateSearch]);

  return {
    refreshSongCache,
    refreshSearchCache,
    refreshAllCaches,
  };
};