/**
 * Advanced Sorting Main Component
 * 
 * Orchestrates the complete advanced sorting system with:
 * - Multi-criteria sorting with drag-and-drop priority
 * - Sort presets management and persistence
 * - Combined sort and filter result management
 * - Real-time sort application
 * 
 * Requirements: 15.3, 15.6, 15.7
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Settings, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { SortingControls } from './SortingControls';
import { MultiCriteriaSorting } from './MultiCriteriaSorting';
import type { SortField, SortDirection } from '@/types/song-library';
import type { 
  SortCriteria, 
  SortConfig, 
  SortPreset, 
  SortingState, 
  AdvancedSortingProps 
} from './types';

// Available sort fields
const AVAILABLE_FIELDS: SortField[] = [
  'title',
  'artist', 
  'key',
  'bpm',
  'usage_count',
  'last_played_at',
  'created_at',
];

// Default sort configuration
const DEFAULT_SORT_CONFIG: SortConfig = {
  criteria: [{ field: 'title', direction: 'asc', priority: 1 }],
  presets: [],
};

// Storage key for persisting sort preferences
const SORT_PREFERENCES_KEY = 'song-library-sort-preferences';

/**
 * Main Advanced Sorting Component
 */
export function AdvancedSorting({
  onSortChange,
  initialCriteria = [{ field: 'title', direction: 'asc', priority: 1 }],
  enableMultiSort = true,
  enablePresets = true,
  maxCriteria = 3,
  className,
}: AdvancedSortingProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    ...DEFAULT_SORT_CONFIG,
    criteria: initialCriteria,
  });
  
  const [sortingState, setSortingState] = useState<SortingState>({
    activeCriteria: initialCriteria,
    isMultiSort: initialCriteria.length > 1,
  });

  const [activeTab, setActiveTab] = useState<'simple' | 'advanced'>('simple');

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_PREFERENCES_KEY);
      if (saved) {
        const preferences = JSON.parse(saved);
        if (preferences.presets) {
          setSortConfig(prev => ({
            ...prev,
            presets: preferences.presets,
          }));
        }
        if (preferences.lastUsed) {
          setSortingState(prev => ({
            ...prev,
            activeCriteria: preferences.lastUsed,
          }));
          setSortConfig(prev => ({
            ...prev,
            criteria: preferences.lastUsed,
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load sort preferences:', error);
    }
  }, []);

  // Save preferences when criteria change
  const savePreferences = useCallback((criteria: SortCriteria[], presets?: SortPreset[]) => {
    try {
      const preferences = {
        lastUsed: criteria,
        presets: presets || sortConfig.presets,
        timestamp: Date.now(),
      };
      localStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save sort preferences:', error);
    }
  }, [sortConfig.presets]);

  // Handle sort criteria change
  const handleSortChange = useCallback((criteria: SortCriteria[]) => {
    setSortingState(prev => ({
      ...prev,
      activeCriteria: criteria,
      isMultiSort: criteria.length > 1,
    }));

    setSortConfig(prev => ({
      ...prev,
      criteria,
    }));

    // Save preferences
    savePreferences(criteria);

    // Notify parent component
    onSortChange(criteria);

    // Switch to advanced tab if multi-criteria
    if (criteria.length > 1 && activeTab === 'simple') {
      setActiveTab('advanced');
    }
  }, [onSortChange, savePreferences, activeTab]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: SortPreset) => {
    setSortingState(prev => ({
      ...prev,
      activePreset: preset.id,
    }));
    
    handleSortChange(preset.criteria);
    toast.success(`Applied "${preset.name}" sort preset`);
  }, [handleSortChange]);

  // Handle preset save
  const handlePresetSave = useCallback((name: string, criteria: SortCriteria[]) => {
    const newPreset: SortPreset = {
      id: `custom-${Date.now()}`,
      name,
      criteria: [...criteria],
    };

    const newPresets = [...sortConfig.presets, newPreset];
    
    setSortConfig(prev => ({
      ...prev,
      presets: newPresets,
    }));

    // Save to localStorage
    savePreferences(criteria, newPresets);
    
    toast.success(`Saved "${name}" sort preset`);
  }, [sortConfig.presets, savePreferences]);

  // Handle preset delete
  const handlePresetDelete = useCallback((presetId: string) => {
    const newPresets = sortConfig.presets.filter(p => p.id !== presetId);
    
    setSortConfig(prev => ({
      ...prev,
      presets: newPresets,
    }));

    // Save to localStorage
    savePreferences(sortingState.activeCriteria, newPresets);
    
    // Clear active preset if it was deleted
    if (sortingState.activePreset === presetId) {
      setSortingState(prev => ({
        ...prev,
        activePreset: undefined,
      }));
    }
  }, [sortConfig.presets, sortingState.activeCriteria, sortingState.activePreset, savePreferences]);

  // Reset to default sort
  const resetSort = useCallback(() => {
    const defaultCriteria = [{ field: 'title' as SortField, direction: 'asc' as SortDirection, priority: 1 }];
    handleSortChange(defaultCriteria);
    setActiveTab('simple');
    toast.success('Reset to default sort');
  }, [handleSortChange]);

  // Check if current sort is default
  const isDefaultSort = useMemo(() => {
    return sortingState.activeCriteria.length === 1 &&
           sortingState.activeCriteria[0].field === 'title' &&
           sortingState.activeCriteria[0].direction === 'asc';
  }, [sortingState.activeCriteria]);

  // Get sort summary for display
  const sortSummary = useMemo(() => {
    if (sortingState.activeCriteria.length === 1) {
      const criteria = sortingState.activeCriteria[0];
      const fieldLabels: Record<SortField, string> = {
        title: 'Title',
        artist: 'Artist',
        key: 'Key',
        bpm: 'BPM',
        usage_count: 'Usage',
        last_played_at: 'Last Played',
        created_at: 'Date Added',
      };
      return `${fieldLabels[criteria.field]} (${criteria.direction === 'asc' ? 'A→Z' : 'Z→A'})`;
    }
    return `${sortingState.activeCriteria.length} criteria`;
  }, [sortingState.activeCriteria]);

  return (
    <div className={cn('advanced-sorting', className)}>
      <Card className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-slate-600" />
            <div>
              <h3 className="text-sm font-medium text-slate-900">Sort Options</h3>
              <p className="text-xs text-slate-500">
                Currently: {sortSummary}
              </p>
            </div>
          </div>

          {!isDefaultSort && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetSort}
              className="text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Sorting Interface */}
        {enableMultiSort ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'simple' | 'advanced')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="simple" className="text-xs">
                Simple Sort
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">
                Multi-Criteria
              </TabsTrigger>
            </TabsList>

            <TabsContent value="simple" className="space-y-4">
              <SortingControls
                sortConfig={sortConfig}
                onSortChange={handleSortChange}
                onPresetSelect={handlePresetSelect}
                onPresetSave={handlePresetSave}
                onPresetDelete={handlePresetDelete}
              />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <MultiCriteriaSorting
                criteria={sortingState.activeCriteria}
                onCriteriaChange={handleSortChange}
                availableFields={AVAILABLE_FIELDS}
                maxCriteria={maxCriteria}
              />

              {enablePresets && (
                <div className="pt-4 border-t border-slate-200">
                  <SortingControls
                    sortConfig={sortConfig}
                    onSortChange={handleSortChange}
                    onPresetSelect={handlePresetSelect}
                    onPresetSave={handlePresetSave}
                    onPresetDelete={handlePresetDelete}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <SortingControls
            sortConfig={sortConfig}
            onSortChange={handleSortChange}
            onPresetSelect={handlePresetSelect}
            onPresetSave={handlePresetSave}
            onPresetDelete={handlePresetDelete}
          />
        )}

        {/* Sort Statistics */}
        {sortingState.activeCriteria.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Settings className="h-3 w-3" />
              <span className="font-medium">Multi-criteria sort active</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Songs will be sorted by {sortingState.activeCriteria.length} criteria in priority order.
              Primary sort: {sortingState.activeCriteria[0].field} ({sortingState.activeCriteria[0].direction}).
            </p>
          </motion.div>
        )}
      </Card>
    </div>
  );
}

export default AdvancedSorting;