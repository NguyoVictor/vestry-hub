/**
 * Advanced Filtering Types
 * 
 * Type definitions for the advanced filtering system with AND/OR logic support.
 */

export type FilterOperator = 
  | 'equals' 
  | 'not_equals'
  | 'contains' 
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false';

export type FilterValue = string | number | boolean | Date | (string | number)[] | null;

export interface FilterCriteria {
  id: string;
  field: string;
  operator: FilterOperator;
  value: FilterValue;
  label?: string;
}

export type FilterLogic = 'AND' | 'OR';

export interface FilterGroup {
  id: string;
  logic: FilterLogic;
  criteria: FilterCriteria[];
  groups?: FilterGroup[];
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filterGroup: FilterGroup;
  isDefault?: boolean;
  isQuickFilter?: boolean;
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterState {
  rootGroup: FilterGroup;
  activePreset?: string;
  resultCount?: number;
}

export interface FilterField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  operators: FilterOperator[];
  options?: { value: string | number; label: string }[];
  placeholder?: string;
  description?: string;
}

export interface AdvancedFilteringProps {
  onFilterChange: (filterGroup: FilterGroup) => void;
  onPresetSelect?: (preset: FilterPreset) => void;
  initialFilters?: FilterGroup;
  availableFields: FilterField[];
  enableLogicBuilder?: boolean;
  enablePresets?: boolean;
  enableQuickFilters?: boolean;
  maxDepth?: number;
  className?: string;
}

export interface FilterLogicBuilderProps {
  filterGroup: FilterGroup;
  onGroupChange: (group: FilterGroup) => void;
  availableFields: FilterField[];
  maxDepth?: number;
  currentDepth?: number;
  className?: string;
}

export interface FilterPresetManagerProps {
  presets: FilterPreset[];
  activePreset?: string;
  onPresetSelect: (preset: FilterPreset) => void;
  onPresetSave: (name: string, description: string, filterGroup: FilterGroup) => void;
  onPresetDelete: (presetId: string) => void;
  onPresetUpdate: (presetId: string, updates: Partial<FilterPreset>) => void;
  className?: string;
}

export interface QuickFilterButtonsProps {
  quickFilters: FilterPreset[];
  onFilterSelect: (preset: FilterPreset) => void;
  activeFilter?: string;
  className?: string;
}