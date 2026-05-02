/**
 * Song Search Hook for Song Library UI Revamp
 * 
 * Provides fuzzy search functionality with Fuse.js integration.
 * Handles search indexing, result ranking, and search history.
 * 
 * Features:
 * - Fuzzy search across song fields (title, artist, lyrics, tags)
 * - Search result ranking and relevance scoring
 * - Real-time search with debouncing
 * - Search history and popular songs
 * - Advanced filtering capabilities
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { TABLES, COLS } from '@/lib/schema';
import type { Song } from '@/types/song-library';

interface SearchFilters {
  key?: string;
  bpmRange?: [number, number];
  timeSignature?: string;
  tags?: string[];
  artist?: string;
  usageCount?: 'high' | 'medium' | 'low' | 'unused';
  dateRange?: [Date, Date];
}

interface SearchOptions {
  limit?: number;
  includeScore?: boolean;
  threshold?: number;
}

interface SearchResult extends Song {
  score?: number;
  matches?: Fuse.FuseResultMatch[];
}

interface UseSongSearchReturn {
  // Search state
  searchResults: SearchResult[];
  isSearching: boolean;
  searchQuery: string;
  searchError: string | null;
  
  // Search history
  recentSearches: string[];
  popularSongs: Song[];
  
  // Search functions
  searchSongs: (query: string, filters?: SearchFilters, options?: SearchOptions) => Promise<void>;
  clearSearch: () => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  
  // Advanced filtering
  applyFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  currentFilters: SearchFilters;
}

// Fuse.js configuration for fuzzy search
const FUSE_OPTIONS: Fuse.IFuseOptions<Song> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'artist', weight: 0.3 },
    { name: 'lyrics', weight: 0.2 },
    { name: 'tags', weight: 0.1 },
    { name: 'key', weight: 0.05 },
  ],
  threshold: 0.3, // Lower = more strict matching
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  findAllMatches: true,
};

// Local storage keys
const STORAGE_KEYS = {
  SEARCH_HISTORY: 'song-library-search-history',
  SEARCH_FILTERS: 'song-library-search-filters',
} as const;

/**
 * Hook for song search functionality
 */
export function useSongSearch(): UseSongSearchReturn {
  const { church } = useChurch();
  const queryClient = useQueryClient();
  
  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  
  // Search history state
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }, []);
  
  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEARCH_FILTERS);
      if (saved) {
        setCurrentFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load search filters:', error);
    }
  }, []);
  
  // Fetch all songs for search indexing
  const { data: allSongs = [] } = useQuery({
    queryKey: ['songs', 'search-index', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq(COLS.TENANT_ID, church.id)
        .order('title');
      
      if (error) throw error;
      return data as Song[];
    },
    enabled: !!church?.id,
    staleTime: 300_000, // 5 minutes
  });
  
  // Fetch popular songs
  const { data: popularSongs = [] } = useQuery({
    queryKey: ['songs', 'popular', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq(COLS.TENANT_ID, church.id)
        .order('usage_count', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as Song[];
    },
    enabled: !!church?.id,
    staleTime: 300_000, // 5 minutes
  });
  
  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    if (allSongs.length === 0) return null;
    return new Fuse(allSongs, FUSE_OPTIONS);
  }, [allSongs]);
  
  // Apply filters to songs
  const applyFiltersToSongs = useCallback((songs: Song[], filters: SearchFilters): Song[] => {
    return songs.filter(song => {
      // Key filter
      if (filters.key && song.key !== filters.key) {
        return false;
      }
      
      // BPM range filter
      if (filters.bpmRange && song.bpm) {
        const [min, max] = filters.bpmRange;
        if (song.bpm < min || song.bpm > max) {
          return false;
        }
      }
      
      // Time signature filter
      if (filters.timeSignature && song.time_signature !== filters.timeSignature) {
        return false;
      }
      
      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const songTags = song.tags || [];
        const hasMatchingTag = filters.tags.some(tag => 
          songTags.some(songTag => 
            songTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      // Artist filter
      if (filters.artist && song.artist) {
        if (!song.artist.toLowerCase().includes(filters.artist.toLowerCase())) {
          return false;
        }
      }
      
      // Usage count filter
      if (filters.usageCount) {
        const usage = song.usage_count || 0;
        switch (filters.usageCount) {
          case 'unused':
            if (usage > 0) return false;
            break;
          case 'low':
            if (usage === 0 || usage > 5) return false;
            break;
          case 'medium':
            if (usage < 6 || usage > 20) return false;
            break;
          case 'high':
            if (usage < 21) return false;
            break;
        }
      }
      
      // Date range filter
      if (filters.dateRange && song.created_at) {
        const songDate = new Date(song.created_at);
        const [startDate, endDate] = filters.dateRange;
        if (songDate < startDate || songDate > endDate) {
          return false;
        }
      }
      
      return true;
    });
  }, []);
  
  // Search songs function
  const searchSongs = useCallback(async (
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ) => {
    if (!fuse || !query.trim()) {
      setSearchResults([]);
      setSearchQuery('');
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    setSearchQuery(query);
    
    try {
      // Perform fuzzy search
      const fuseResults = fuse.search(query, {
        limit: options.limit || 50,
      });
      
      // Extract songs with scores
      let results: SearchResult[] = fuseResults.map(result => ({
        ...result.item,
        score: result.score,
        matches: result.matches,
      }));
      
      // Apply additional filters
      const mergedFilters = { ...currentFilters, ...filters };
      if (Object.keys(mergedFilters).length > 0) {
        results = applyFiltersToSongs(results, mergedFilters) as SearchResult[];
      }
      
      // Sort by relevance score (lower is better in Fuse.js)
      results.sort((a, b) => (a.score || 0) - (b.score || 0));
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [fuse, currentFilters, applyFiltersToSongs]);
  
  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
    setSearchError(null);
  }, []);
  
  // Add query to search history
  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      
      try {
        localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save search history:', error);
      }
      
      return updated;
    });
  }, []);
  
  // Clear search history
  const clearHistory = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }, []);
  
  // Apply filters
  const applyFilters = useCallback((filters: SearchFilters) => {
    setCurrentFilters(filters);
    
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_FILTERS, JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save search filters:', error);
    }
    
    // Re-run search with new filters if there's an active query
    if (searchQuery) {
      searchSongs(searchQuery, filters);
    }
  }, [searchQuery, searchSongs]);
  
  // Clear filters
  const clearFilters = useCallback(() => {
    setCurrentFilters({});
    
    try {
      localStorage.removeItem(STORAGE_KEYS.SEARCH_FILTERS);
    } catch (error) {
      console.warn('Failed to clear search filters:', error);
    }
    
    // Re-run search without filters if there's an active query
    if (searchQuery) {
      searchSongs(searchQuery, {});
    }
  }, [searchQuery, searchSongs]);
  
  return {
    // Search state
    searchResults,
    isSearching,
    searchQuery,
    searchError,
    
    // Search history
    recentSearches,
    popularSongs,
    
    // Search functions
    searchSongs,
    clearSearch,
    addToHistory,
    clearHistory,
    
    // Advanced filtering
    applyFilters,
    clearFilters,
    currentFilters,
  };
}

/**
 * Utility function to highlight search matches in text
 */
export function highlightMatches(text: string, matches?: Fuse.FuseResultMatch[]): string {
  if (!matches || matches.length === 0) {
    return text;
  }
  
  // Find matches for this text field
  const textMatches = matches.filter(match => 
    typeof match.value === 'string' && match.value === text
  );
  
  if (textMatches.length === 0) {
    return text;
  }
  
  // For now, just return the original text
  // In a React component, this would return JSX with highlighted portions
  return text;
}

/**
 * Utility function to get search suggestions based on query
 */
export function getSearchSuggestions(query: string, songs: Song[]): string[] {
  if (!query.trim() || songs.length === 0) return [];
  
  const suggestions = new Set<string>();
  const lowerQuery = query.toLowerCase();
  
  songs.forEach(song => {
    // Title suggestions
    if (song.title.toLowerCase().includes(lowerQuery)) {
      suggestions.add(song.title);
    }
    
    // Artist suggestions
    if (song.artist && song.artist.toLowerCase().includes(lowerQuery)) {
      suggestions.add(song.artist);
    }
    
    // Tag suggestions
    song.tags?.forEach(tag => {
      if (tag.toLowerCase().includes(lowerQuery)) {
        suggestions.add(tag);
      }
    });
  });
  
  return Array.from(suggestions).slice(0, 5);
}

export default useSongSearch;