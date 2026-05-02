/**
 * Filter and Sort Utilities
 * 
 * Utility functions for applying advanced filtering and sorting logic to song collections.
 * Supports multi-criteria filtering with AND/OR logic and multi-criteria sorting.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.6, 15.7
 */

import type { Song } from '@/types/song-library';
import type { 
  FilterGroup, 
  FilterCriteria, 
  FilterOperator, 
  FilterValue 
} from '../components/AdvancedFiltering/types';
import type { SortCriteria } from '../components/AdvancedSorting/types';

/**
 * Apply a single filter criteria to a song
 */
function applyCriteria(song: Song, criteria: FilterCriteria): boolean {
  const fieldValue = getFieldValue(song, criteria.field);
  
  switch (criteria.operator) {
    case 'equals':
      return fieldValue === criteria.value;
      
    case 'not_equals':
      return fieldValue !== criteria.value;
      
    case 'contains':
      if (typeof fieldValue === 'string' && typeof criteria.value === 'string') {
        return fieldValue.toLowerCase().includes(criteria.value.toLowerCase());
      }
      return false;
      
    case 'not_contains':
      if (typeof fieldValue === 'string' && typeof criteria.value === 'string') {
        return !fieldValue.toLowerCase().includes(criteria.value.toLowerCase());
      }
      return true;
      
    case 'starts_with':
      if (typeof fieldValue === 'string' && typeof criteria.value === 'string') {
        return fieldValue.toLowerCase().startsWith(criteria.value.toLowerCase());
      }
      return false;
      
    case 'ends_with':
      if (typeof fieldValue === 'string' && typeof criteria.value === 'string') {
        return fieldValue.toLowerCase().endsWith(criteria.value.toLowerCase());
      }
      return false;
      
    case 'greater_than':
      if (typeof fieldValue === 'number' && typeof criteria.value === 'number') {
        return fieldValue > criteria.value;
      }
      if (fieldValue instanceof Date && criteria.value instanceof Date) {
        return fieldValue > criteria.value;
      }
      return false;
      
    case 'less_than':
      if (typeof fieldValue === 'number' && typeof criteria.value === 'number') {
        return fieldValue < criteria.value;
      }
      if (fieldValue instanceof Date && criteria.value instanceof Date) {
        return fieldValue < criteria.value;
      }
      return false;
      
    case 'greater_than_or_equal':
      if (typeof fieldValue === 'number' && typeof criteria.value === 'number') {
        return fieldValue >= criteria.value;
      }
      if (fieldValue instanceof Date && criteria.value instanceof Date) {
        return fieldValue >= criteria.value;
      }
      return false;
      
    case 'less_than_or_equal':
      if (typeof fieldValue === 'number' && typeof criteria.value === 'number') {
        return fieldValue <= criteria.value;
      }
      if (fieldValue instanceof Date && criteria.value instanceof Date) {
        return fieldValue <= criteria.value;
      }
      return false;
      
    case 'between':
      if (Array.isArray(criteria.value) && criteria.value.length === 2) {
        const [min, max] = criteria.value;
        if (typeof fieldValue === 'number' && typeof min === 'number' && typeof max === 'number') {
          return fieldValue >= min && fieldValue <= max;
        }
        if (fieldValue instanceof Date && min instanceof Date && max instanceof Date) {
          return fieldValue >= min && fieldValue <= max;
        }
      }
      return false;
      
    case 'in':
      if (Array.isArray(criteria.value)) {
        return criteria.value.includes(fieldValue);
      }
      return false;
      
    case 'not_in':
      if (Array.isArray(criteria.value)) {
        return !criteria.value.includes(fieldValue);
      }
      return true;
      
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
      
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      
    case 'is_true':
      return fieldValue === true;
      
    case 'is_false':
      return fieldValue === false;
      
    default:
      return true;
  }
}

/**
 * Apply a filter group to a song (supports nested groups with AND/OR logic)
 */
function applyFilterGroup(song: Song, group: FilterGroup): boolean {
  const criteriaResults = group.criteria.map(criteria => applyCriteria(song, criteria));
  const groupResults = group.groups?.map(nestedGroup => applyFilterGroup(song, nestedGroup)) || [];
  
  const allResults = [...criteriaResults, ...groupResults];
  
  if (allResults.length === 0) {
    return true; // No filters means include all
  }
  
  if (group.logic === 'AND') {
    return allResults.every(result => result);
  } else {
    return allResults.some(result => result);
  }
}

/**
 * Get field value from song object
 */
function getFieldValue(song: Song, field: string): any {
  switch (field) {
    case 'title':
      return song.title;
    case 'artist':
      return song.artist;
    case 'key':
      return song.key;
    case 'bpm':
      return song.bpm;
    case 'time_signature':
      return song.time_signature;
    case 'usage_count':
      return song.usage_count;
    case 'last_played_at':
      return song.last_played_at ? new Date(song.last_played_at) : null;
    case 'created_at':
      return new Date(song.created_at);
    case 'updated_at':
      return new Date(song.updated_at);
    case 'is_trending':
      return song.is_trending;
    case 'has_lyrics':
      return Boolean(song.lyrics);
    case 'has_chords':
      return Boolean(song.chords || song.chord_sheet_path);
    case 'has_cover_art':
      return Boolean(song.cover_art_url);
    case 'tags':
      return song.tags;
    default:
      return (song as any)[field];
  }
}

/**
 * Apply advanced filtering to a song collection
 */
export function applyAdvancedFiltering(songs: Song[], filterGroup: FilterGroup): Song[] {
  if (!filterGroup || (filterGroup.criteria.length === 0 && (!filterGroup.groups || filterGroup.groups.length === 0))) {
    return songs;
  }
  
  return songs.filter(song => applyFilterGroup(song, filterGroup));
}

/**
 * Apply multi-criteria sorting to a song collection
 */
export function applyMultiCriteriaSorting(songs: Song[], sortCriteria: SortCriteria[]): Song[] {
  if (!sortCriteria || sortCriteria.length === 0) {
    return songs;
  }
  
  // Sort by priority (lower number = higher priority)
  const orderedCriteria = [...sortCriteria].sort((a, b) => a.priority - b.priority);
  
  return [...songs].sort((a, b) => {
    for (const criteria of orderedCriteria) {
      const aValue = getFieldValue(a, criteria.field);
      const bValue = getFieldValue(b, criteria.field);
      
      const comparison = compareValues(aValue, bValue);
      
      if (comparison !== 0) {
        return criteria.direction === 'desc' ? -comparison : comparison;
      }
    }
    
    return 0;
  });
}

/**
 * Compare two values for sorting
 */
function compareValues(a: any, b: any): number {
  // Handle null/undefined values
  if (a === null || a === undefined) {
    if (b === null || b === undefined) return 0;
    return -1;
  }
  if (b === null || b === undefined) {
    return 1;
  }
  
  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  
  // Handle numbers
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  
  // Handle strings (case-insensitive)
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  }
  
  // Handle booleans
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b ? 0 : a ? 1 : -1;
  }
  
  // Handle arrays (compare lengths)
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length - b.length;
  }
  
  // Fallback to string comparison
  return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
}

/**
 * Apply both filtering and sorting to a song collection
 */
export function applyFilteringAndSorting(
  songs: Song[], 
  filterGroup: FilterGroup, 
  sortCriteria: SortCriteria[]
): Song[] {
  // First apply filtering
  const filteredSongs = applyAdvancedFiltering(songs, filterGroup);
  
  // Then apply sorting
  return applyMultiCriteriaSorting(filteredSongs, sortCriteria);
}

/**
 * Get filter result statistics
 */
export function getFilterStats(
  originalSongs: Song[], 
  filteredSongs: Song[]
): {
  total: number;
  filtered: number;
  percentage: number;
} {
  const total = originalSongs.length;
  const filtered = filteredSongs.length;
  const percentage = total > 0 ? Math.round((filtered / total) * 100) : 0;
  
  return { total, filtered, percentage };
}

/**
 * Validate filter criteria
 */
export function validateFilterCriteria(criteria: FilterCriteria): string[] {
  const errors: string[] = [];
  
  if (!criteria.field) {
    errors.push('Field is required');
  }
  
  if (!criteria.operator) {
    errors.push('Operator is required');
  }
  
  // Check if operator requires a value
  const operatorRequiresValue = ![
    'is_empty', 
    'is_not_empty', 
    'is_true', 
    'is_false'
  ].includes(criteria.operator);
  
  if (operatorRequiresValue && (criteria.value === null || criteria.value === undefined)) {
    errors.push('Value is required for this operator');
  }
  
  // Validate range operators
  if (criteria.operator === 'between' && Array.isArray(criteria.value)) {
    if (criteria.value.length !== 2) {
      errors.push('Between operator requires exactly 2 values');
    }
  }
  
  // Validate array operators
  if (['in', 'not_in'].includes(criteria.operator) && !Array.isArray(criteria.value)) {
    errors.push('This operator requires an array of values');
  }
  
  return errors;
}

/**
 * Validate filter group
 */
export function validateFilterGroup(group: FilterGroup): string[] {
  const errors: string[] = [];
  
  // Validate criteria
  group.criteria.forEach((criteria, index) => {
    const criteriaErrors = validateFilterCriteria(criteria);
    criteriaErrors.forEach(error => {
      errors.push(`Criteria ${index + 1}: ${error}`);
    });
  });
  
  // Validate nested groups
  group.groups?.forEach((nestedGroup, index) => {
    const groupErrors = validateFilterGroup(nestedGroup);
    groupErrors.forEach(error => {
      errors.push(`Group ${index + 1}: ${error}`);
    });
  });
  
  return errors;
}