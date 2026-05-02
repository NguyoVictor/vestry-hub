/**
 * Advanced Sorting Types
 * 
 * Type definitions for the advanced sorting system with multi-criteria support.
 */

import type { SortField, SortDirection } from '@/types/song-library';

export interface SortCriteria {
  field: SortField;
  direction: SortDirection;
  priority: number; // 1 = highest priority
}

export interface SortConfig {
  criteria: SortCriteria[];
  presets: SortPreset[];
}

export interface SortPreset {
  id: string;
  name: string;
  criteria: SortCriteria[];
  isDefault?: boolean;
}

export interface SortingState {
  activeCriteria: SortCriteria[];
  activePreset?: string;
  isMultiSort: boolean;
}

export interface SortingControlsProps {
  sortConfig: SortConfig;
  onSortChange: (criteria: SortCriteria[]) => void;
  onPresetSelect: (preset: SortPreset) => void;
  onPresetSave: (name: string, criteria: SortCriteria[]) => void;
  onPresetDelete: (presetId: string) => void;
  className?: string;
}

export interface MultiCriteriaSortingProps {
  criteria: SortCriteria[];
  onCriteriaChange: (criteria: SortCriteria[]) => void;
  availableFields: SortField[];
  maxCriteria?: number;
  className?: string;
}

export interface AdvancedSortingProps {
  onSortChange: (criteria: SortCriteria[]) => void;
  initialCriteria?: SortCriteria[];
  enableMultiSort?: boolean;
  enablePresets?: boolean;
  maxCriteria?: number;
  className?: string;
}