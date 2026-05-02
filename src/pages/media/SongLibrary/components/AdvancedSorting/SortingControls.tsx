/**
 * Sorting Controls Component
 * 
 * Provides UI controls for managing sorting criteria including:
 * - Single and multi-criteria sorting
 * - Sort direction control
 * - Sort presets management
 * - Quick sort buttons
 * 
 * Requirements: 15.3, 15.6, 15.7
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Save,
  RotateCcw,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import type { SortField, SortDirection } from '@/types/song-library';
import type { SortCriteria, SortPreset, SortingControlsProps } from './types';

// Sort field labels for display
const SORT_FIELD_LABELS: Record<SortField, string> = {
  title: 'Title',
  artist: 'Artist',
  key: 'Key',
  bpm: 'BPM',
  usage_count: 'Usage Count',
  last_played_at: 'Last Played',
  created_at: 'Date Added',
};

// Default sort presets
const DEFAULT_PRESETS: SortPreset[] = [
  {
    id: 'alphabetical',
    name: 'Alphabetical',
    criteria: [{ field: 'title', direction: 'asc', priority: 1 }],
    isDefault: true,
  },
  {
    id: 'most-used',
    name: 'Most Used',
    criteria: [
      { field: 'usage_count', direction: 'desc', priority: 1 },
      { field: 'title', direction: 'asc', priority: 2 },
    ],
    isDefault: true,
  },
  {
    id: 'recently-played',
    name: 'Recently Played',
    criteria: [
      { field: 'last_played_at', direction: 'desc', priority: 1 },
      { field: 'title', direction: 'asc', priority: 2 },
    ],
    isDefault: true,
  },
  {
    id: 'newest-first',
    name: 'Newest First',
    criteria: [
      { field: 'created_at', direction: 'desc', priority: 1 },
      { field: 'title', direction: 'asc', priority: 2 },
    ],
    isDefault: true,
  },
  {
    id: 'by-key-bpm',
    name: 'By Key & BPM',
    criteria: [
      { field: 'key', direction: 'asc', priority: 1 },
      { field: 'bpm', direction: 'asc', priority: 2 },
      { field: 'title', direction: 'asc', priority: 3 },
    ],
    isDefault: true,
  },
];

/**
 * Main Sorting Controls Component
 */
export function SortingControls({
  sortConfig,
  onSortChange,
  onPresetSelect,
  onPresetSave,
  onPresetDelete,
  className,
}: SortingControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showMultiSort, setShowMultiSort] = useState(false);

  const activeCriteria = sortConfig.criteria;
  const presets = [...DEFAULT_PRESETS, ...sortConfig.presets];

  // Add new sort criteria
  const addCriteria = useCallback(() => {
    const newCriteria: SortCriteria = {
      field: 'title',
      direction: 'asc',
      priority: activeCriteria.length + 1,
    };
    onSortChange([...activeCriteria, newCriteria]);
    setShowMultiSort(true);
  }, [activeCriteria, onSortChange]);

  // Remove sort criteria
  const removeCriteria = useCallback((index: number) => {
    const newCriteria = activeCriteria.filter((_, i) => i !== index);
    // Reorder priorities
    const reorderedCriteria = newCriteria.map((criteria, i) => ({
      ...criteria,
      priority: i + 1,
    }));
    onSortChange(reorderedCriteria);
    
    if (reorderedCriteria.length <= 1) {
      setShowMultiSort(false);
    }
  }, [activeCriteria, onSortChange]);

  // Update sort criteria
  const updateCriteria = useCallback((index: number, updates: Partial<SortCriteria>) => {
    const newCriteria = [...activeCriteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    onSortChange(newCriteria);
  }, [activeCriteria, onSortChange]);

  // Clear all sorting
  const clearSort = useCallback(() => {
    onSortChange([{ field: 'title', direction: 'asc', priority: 1 }]);
    setShowMultiSort(false);
  }, [onSortChange]);

  // Save current sort as preset
  const savePreset = useCallback(() => {
    if (!newPresetName.trim()) return;

    onPresetSave(newPresetName.trim(), activeCriteria);
    setNewPresetName('');
    setShowPresetSave(false);
    toast.success('Sort preset saved');
  }, [newPresetName, activeCriteria, onPresetSave]);

  // Apply preset
  const applyPreset = useCallback((preset: SortPreset) => {
    onPresetSelect(preset);
    onSortChange(preset.criteria);
    setShowMultiSort(preset.criteria.length > 1);
    toast.success(`Applied "${preset.name}" sort`);
  }, [onPresetSelect, onSortChange]);

  // Toggle sort direction for primary criteria
  const toggleDirection = useCallback(() => {
    if (activeCriteria.length > 0) {
      const newDirection = activeCriteria[0].direction === 'asc' ? 'desc' : 'asc';
      updateCriteria(0, { direction: newDirection });
    }
  }, [activeCriteria, updateCriteria]);

  // Get sort direction icon
  const getSortIcon = (direction: SortDirection) => {
    return direction === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const primaryCriteria = activeCriteria[0];
  const hasMultipleCriteria = activeCriteria.length > 1;

  return (
    <div className={cn('sorting-controls', className)}>
      {/* Main Sort Controls */}
      <div className="flex items-center gap-2">
        {/* Primary Sort Field */}
        <Select
          value={primaryCriteria?.field || 'title'}
          onValueChange={(field) => updateCriteria(0, { field: field as SortField })}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_FIELD_LABELS).map(([field, label]) => (
              <SelectItem key={field} value={field}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Direction Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDirection}
          className="h-8 px-2"
        >
          {primaryCriteria ? getSortIcon(primaryCriteria.direction) : <ArrowUpDown className="h-3 w-3" />}
        </Button>

        {/* Multi-Sort Indicator */}
        {hasMultipleCriteria && (
          <Badge variant="secondary" className="text-xs">
            +{activeCriteria.length - 1} more
          </Badge>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 px-2"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
        </Button>

        {/* Clear Sort */}
        {(hasMultipleCriteria || primaryCriteria?.field !== 'title' || primaryCriteria?.direction !== 'asc') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSort}
            className="h-8 px-2 text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Expanded Controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-4 border-t border-slate-200 pt-4"
          >
            {/* Sort Presets */}
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-2 block">
                Quick Sort Presets
              </Label>
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="text-xs relative"
                  >
                    {preset.name}
                    {!preset.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPresetDelete(preset.id);
                          toast.success('Preset deleted');
                        }}
                        className="ml-1 h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Multi-Criteria Sorting */}
            {(showMultiSort || hasMultipleCriteria) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium text-slate-600">
                    Sort Criteria (Priority Order)
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addCriteria}
                    disabled={activeCriteria.length >= 3}
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {activeCriteria.map((criteria, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                    >
                      <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center">
                        {index + 1}
                      </Badge>

                      <Select
                        value={criteria.field}
                        onValueChange={(field) => updateCriteria(index, { field: field as SortField })}
                      >
                        <SelectTrigger className="h-7 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SORT_FIELD_LABELS).map(([field, label]) => (
                            <SelectItem key={field} value={field}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCriteria(index, { 
                          direction: criteria.direction === 'asc' ? 'desc' : 'asc' 
                        })}
                        className="h-7 px-2"
                      >
                        {getSortIcon(criteria.direction)}
                      </Button>

                      {activeCriteria.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCriteria(index)}
                          className="h-7 px-2 text-slate-500 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {!showMultiSort && !hasMultipleCriteria && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMultiSort(true)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Multi-Criteria Sort
              </Button>
            )}

            {/* Save Preset */}
            <Separator />
            <div className="flex items-center gap-2">
              {showPresetSave ? (
                <>
                  <Input
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="h-7 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') savePreset();
                      if (e.key === 'Escape') setShowPresetSave(false);
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={savePreset} disabled={!newPresetName.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowPresetSave(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPresetSave(true)}
                  className="text-slate-500"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save current sort as preset
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SortingControls;