/**
 * Advanced Filter and Sort Hook
 * 
 * Custom hook that manages advanced filtering and sorting state for the Song Library.
 * Integrates filtering logic, sorting criteria, and result management.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.6, 15.7
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Song } from '@/types/song-library';
import type { 
  FilterGroup, 
  FilterPreset, 
  FilterField 
} from '../components/AdvancedFiltering/types';
import type { 
  SortCriteria, 
  SortPreset 
} from '../components/AdvancedSorting/types';
import { 
  applyFilteringAndSorting, 
  getFilterStats,
  validateFilterGroup 
} from '../utils/filterSortUtils';

// Available filter fields for songs
const SONG_FILTER_FIELDS: FilterField[] = [
  {
    key: 'title',
    label: 'Title',
    type: 'string',
    operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
    placeholder: 'Enter song title...',
    description: 'Song title',
  },
  {
    key: 'artist',
    label: 'Artist',
    type: 'string',
    operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
    placeholder: 'Enter artist name...',
    description: 'Artist or composer name',
  },
  {
    key: 'key',
    label: 'Musical Key',
    type: 'select',
    operators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    options: [
      { value: 'C', label: 'C' },
      { value: 'C#', label: 'C#' },
      { value: 'Db', label: 'Db' },
      { value: 'D', label: 'D' },
      { value: 'D#', label: 'D#' },
      { value: 'Eb', label: 'Eb' },
      { value: 'E', label: 'E' },
      { value: 'F', label: 'F' },
      { value: 'F#', label: 'F#' },
      { value: 'Gb', label: 'Gb' },
      { value: 'G', label: 'G' },
      { value: 'G#', label: 'G#' },
      { value: 'Ab', label: 'Ab' },
      { value: 'A', label: 'A' },
      { value: 'A#', label: 'A#' },
      { value: 'Bb', label: 'Bb' },
      { value: 'B', label: 'B' },
      { value: 'Cm', label: 'Cm' },
      { value: 'C#m', label: 'C#m' },
      { value: 'Dm', label: 'Dm' },
      { value: 'D#m', label: 'D#m' },
      { value: 'Em', label: 'Em' },
      { value: 'Fm', label: 'Fm' },
      { value: 'F#m', label: 'F#m' },
      { value: 'Gm', label: 'Gm' },
      { value: 'G#m', label: 'G#m' },
      { value: 'Am', label: 'Am' },
      { value: 'A#m', label: 'A#m' },
      { value: 'Bm', label: 'Bm' },
    ],
    description: 'Musical key of the song',
  },
  {
    key: 'bpm',
    label: 'BPM (Tempo)',
    type: 'number',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'is_empty', 'is_not_empty'],
    placeholder: '120',
    description: 'Beats per minute (tempo)',
  },
  {
    key: 'time_signature',
    label: 'Time Signature',
    type: 'select',
    operators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    options: [
      { value: '4/4', label: '4/4' },
      { value: '3/4', label: '3/4' },
      { value: '2/4', label: '2/4' },
      { value: '6/8', label: '6/8' },
      { value: '12/8', label: '12/8' },
      { value: '5/4', label: '5/4' },
      { value: '7/8', label: '7/8' },
    ],
    description: 'Time signature of the song',
  },
  {
    key: 'usage_count',
    label: 'Usage Count',
    type: 'number',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between'],
    placeholder: '0',
    description: 'Number of times used in services',
  },
  {
    key: 'last_played_at',
    label: 'Last Played',
    type: 'date',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'is_empty', 'is_not_empty'],
    description: 'When the song was last played',
  },
  {
    key: 'created_at',
    label: 'Date Added',
    type: 'date',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between'],
    description: 'When the song was added to the library',
  },
  {
    key: 'is_trending',
    label: 'Is Trending',
    type: 'boolean',
    operators: ['is_true', 'is_false'],
    description: 'Whether the song is currently trending',
  },
  {
    key: 'has_lyrics',
    label: 'Has Lyrics',
    type: 'boolean',
    operators: ['is_true', 'is_false'],
    description: 'Whether the song has lyrics',
  },
  {
    key: 'has_chords',
    label: 'Has Chords',
    type: 'boolean',
    operators: ['is_true', 'is_false'],
    description: 'Whether the song has chord charts',
  },
  {
    key: 'has_cover_art',
    label: 'Has Cover Art',
    type: 'boolean',
    operators: ['is_true', 'is_false'],
    description: 'Whether the song has cover art',
  },
];

interface UseAdvancedFilterSortOptions {
  songs: Song[];
  initialFilters?: FilterGroup;
  initialSort?: SortCriteria[];
  enablePersistence?: boolean;
}

interface UseAdvancedFilterSortReturn {
  // Filtered and sorted results
  filteredSongs: Song[];
  
  // Filter state
  filterGroup: FilterGroup;
  setFilterGroup: (group: FilterGroup) => void;
  clearFilters: () => void;
  
  // Sort state
  sortCriteria: SortCriteria[];
  setSortCriteria: (criteria: SortCriteria[]) => void;
  clearSort: () => void;
  
  // Combined actions
  clearAll: () => void;
  
  // Statistics
  stats: {
    total: number;
    filtered: number;
    percentage: number;
  };
  
  // Validation
  filterErrors: string[];
  isValid: boolean;
  
  // Available fields
  availableFields: FilterField[];
  
  // Loading state
  isProcessing: boolean;
}

// Default filter group
const DEFAULT_FILTER_GROUP: FilterGroup = {
  id: 'root',
  logic: 'AND',
  criteria: [],
  groups: [],
};

// Default sort criteria
const DEFAULT_SORT_CRITERIA: SortCriteria[] = [
  { field: 'title', direction: 'asc', priority: 1 }
];

/**
 * Advanced Filter and Sort Hook
 */
export function useAdvancedFilterSort({
  songs,
  initialFilters = DEFAULT_FILTER_GROUP,
  initialSort = DEFAULT_SORT_CRITERIA,
  enablePersistence = true,
}: UseAdvancedFilterSortOptions): UseAdvancedFilterSortReturn {
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(initialFilters);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>(initialSort);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    if (!enablePersistence) return;

    try {
      const saved = localStorage.getItem('song-library-advanced-filter-sort');
      if (saved) {
        const { filters, sort } = JSON.parse(saved);
        if (filters) setFilterGroup(filters);
        if (sort) setSortCriteria(sort);
      }
    } catch (error) {
      console.warn('Failed to load filter/sort preferences:', error);
    }
  }, [enablePersistence]);

  // Persist state changes
  useEffect(() => {
    if (!enablePersistence) return;

    try {
      const state = {
        filters: filterGroup,
        sort: sortCriteria,
        timestamp: Date.now(),
      };
      localStorage.setItem('song-library-advanced-filter-sort', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save filter/sort preferences:', error);
    }
  }, [filterGroup, sortCriteria, enablePersistence]);

  // Validate filter group
  const filterErrors = useMemo(() => {
    return validateFilterGroup(filterGroup);
  }, [filterGroup]);

  const isValid = filterErrors.length === 0;

  // Apply filtering and sorting
  const filteredSongs = useMemo(() => {
    if (!isValid) return songs;

    setIsProcessing(true);
    
    try {
      const result = applyFilteringAndSorting(songs, filterGroup, sortCriteria);
      return result;
    } catch (error) {
      console.error('Error applying filters/sort:', error);
      return songs;
    } finally {
      // Use setTimeout to avoid state update during render
      setTimeout(() => setIsProcessing(false), 0);
    }
  }, [songs, filterGroup, sortCriteria, isValid]);

  // Calculate statistics
  const stats = useMemo(() => {
    return getFilterStats(songs, filteredSongs);
  }, [songs, filteredSongs]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilterGroup(DEFAULT_FILTER_GROUP);
  }, []);

  // Clear sort
  const clearSort = useCallback(() => {
    setSortCriteria(DEFAULT_SORT_CRITERIA);
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    clearFilters();
    clearSort();
  }, [clearFilters, clearSort]);

  return {
    filteredSongs,
    filterGroup,
    setFilterGroup,
    clearFilters,
    sortCriteria,
    setSortCriteria,
    clearSort,
    clearAll,
    stats,
    filterErrors,
    isValid,
    availableFields: SONG_FILTER_FIELDS,
    isProcessing,
  };
}

export default useAdvancedFilterSort;