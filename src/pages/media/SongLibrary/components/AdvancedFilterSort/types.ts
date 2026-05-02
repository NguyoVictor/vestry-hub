/**
 * Advanced Filter and Sort Integration Types
 */

import type { Song } from '@/types/song-library';
import type { FilterGroup, FilterPreset } from '../AdvancedFiltering/types';
import type { SortCriteria, SortPreset } from '../AdvancedSorting/types';

export interface FilterSortState {
  filterGroup: FilterGroup;
  sortCriteria: SortCriteria[];
  activeFilterPreset?: string;
  activeSortPreset?: string;
  resultCount: number;
  isProcessing: boolean;
}

export interface AdvancedFilterSortProps {
  songs: Song[];
  onResultsChange: (songs: Song[], state: FilterSortState) => void;
  initialFilters?: FilterGroup;
  initialSort?: SortCriteria[];
  enablePersistence?: boolean;
  enableQuickActions?: boolean;
  className?: string;
}

export interface FilterSortPanelProps {
  songs: Song[];
  onResultsChange: (songs: Song[], state: FilterSortState) => void;
  initialState?: Partial<FilterSortState>;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export interface FilterSortToolbarProps {
  state: FilterSortState;
  onClearFilters: () => void;
  onClearSort: () => void;
  onClearAll: () => void;
  onTogglePanel: () => void;
  showResultCount?: boolean;
  compact?: boolean;
  className?: string;
}