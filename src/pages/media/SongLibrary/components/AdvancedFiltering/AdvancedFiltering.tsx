/**
 * Advanced Filtering Main Component
 * 
 * Orchestrates the complete advanced filtering system with:
 * - Multi-criteria filtering with AND/OR logic
 * - Filter presets management and saving
 * - Quick filter buttons for common criteria
 * - Combined filter and sort result management
 * 
 * Requirements: 15.1, 15.2, 15.4, 15.5, 15.6, 15.7
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Settings, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { FilterLogicBuilder } from './FilterLogicBuilder';
import { FilterPresetManager } from './FilterPresetManager';
import { QuickFilterButtons } from './QuickFilterButtons';
import type { 
  FilterGroup, 
  FilterPreset, 
  FilterField, 
  FilterState,
  AdvancedFilteringProps 
} from './types';

// Default filter group
const DEFAULT_FILTER_GROUP: FilterGroup = {
  id: 'root',
  logic: 'AND',
  criteria: [],
  groups: [],
};

// Default filter presets for song library
const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'trending-songs',
    name: 'Trending Songs',
    description: 'Songs that are currently popular',
    icon: '🔥',
    color: 'orange',
    isDefault: true,
    isQuickFilter: true,
    filterGroup: {
      id: 'trending',
      logic: 'AND',
      criteria: [
        {
          id: 'trending-1',
          field: 'is_trending',
          operator: 'is_true',
          value: null,
        }
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'recent-songs',
    name: 'Recently Added',
    description: 'Songs added in the last 30 days',
    icon: '🆕',
    color: 'blue',
    isDefault: true,
    isQuickFilter: true,
    filterGroup: {
      id: 'recent',
      logic: 'AND',
      criteria: [
        {
          id: 'recent-1',
          field: 'created_at',
          operator: 'greater_than',
          value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        }
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'unused-songs',
    name: 'Unused Songs',
    description: 'Songs that have never been used in services',
    icon: '💤',
    color: 'slate',
    isDefault: true,
    isQuickFilter: true,
    filterGroup: {
      id: 'unused',
      logic: 'AND',
      criteria: [
        {
          id: 'unused-1',
          field: 'usage_count',
          operator: 'equals',
          value: 0,
        }
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'worship-keys',
    name: 'Common Worship Keys',
    description: 'Songs in keys commonly used for worship (C, D, G, A)',
    icon: '🎹',
    color: 'emerald',
    isDefault: true,
    isQuickFilter: true,
    filterGroup: {
      id: 'worship-keys',
      logic: 'AND',
      criteria: [
        {
          id: 'keys-1',
          field: 'key',
          operator: 'in',
          value: ['C', 'D', 'G', 'A'],
        }
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'fast-songs',
    name: 'Fast Songs',
    description: 'Upbeat songs with BPM over 120',
    icon: '⚡',
    color: 'yellow',
    isDefault: true,
    isQuickFilter: true,
    filterGroup: {
      id: 'fast',
      logic: 'AND',
      criteria: [
        {
          id: 'fast-1',
          field: 'bpm',
          operator: 'greater_than',
          value: 120,
        }
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'slow-songs',
    name: 'Slow Songs',
    description: 'Contemplative songs with BPM under 80',
    icon: '🕊️',
    color: 'purple',
    isDefault: true,
    isQuickFilter: true,
    filterGroup: {
      id: 'slow',
      logic: 'AND',
      criteria: [
        {
          id: 'slow-1',
          field: 'bpm',
          operator: 'less_than',
          value: 80,
        }
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Storage key for persisting filter preferences
const FILTER_PREFERENCES_KEY = 'song-library-filter-preferences';

/**
 * Main Advanced Filtering Component
 */
export function AdvancedFiltering({
  onFilterChange,
  onPresetSelect,
  initialFilters = DEFAULT_FILTER_GROUP,
  availableFields,
  enableLogicBuilder = true,
  enablePresets = true,
  enableQuickFilters = true,
  maxDepth = 3,
  className,
}: AdvancedFilteringProps) {
  const [filterState, setFilterState] = useState<FilterState>({
    rootGroup: initialFilters,
  });

  const [presets, setPresets] = useState<FilterPreset[]>(DEFAULT_PRESETS);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'advanced' | 'presets'>('quick');

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTER_PREFERENCES_KEY);
      if (saved) {
        const preferences = JSON.parse(saved);
        if (preferences.presets) {
          setPresets(prev => [...prev.filter(p => p.isDefault), ...preferences.presets]);
        }
        if (preferences.lastUsed) {
          setFilterState(prev => ({
            ...prev,
            rootGroup: preferences.lastUsed,
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load filter preferences:', error);
    }
  }, []);

  // Save preferences when filters change
  const savePreferences = useCallback((filterGroup: FilterGroup, customPresets?: FilterPreset[]) => {
    try {
      const preferences = {
        lastUsed: filterGroup,
        presets: customPresets || presets.filter(p => !p.isDefault),
        timestamp: Date.now(),
      };
      localStorage.setItem(FILTER_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save filter preferences:', error);
    }
  }, [presets]);

  // Handle filter group change
  const handleFilterChange = useCallback((filterGroup: FilterGroup) => {
    setFilterState(prev => ({
      ...prev,
      rootGroup: filterGroup,
    }));

    // Save preferences
    savePreferences(filterGroup);

    // Notify parent component
    onFilterChange(filterGroup);
  }, [onFilterChange, savePreferences]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: FilterPreset) => {
    setFilterState(prev => ({
      ...prev,
      rootGroup: preset.filterGroup,
      activePreset: preset.id,
    }));

    handleFilterChange(preset.filterGroup);
    
    if (onPresetSelect) {
      onPresetSelect(preset);
    }

    toast.success(`Applied "${preset.name}" filter`);
  }, [handleFilterChange, onPresetSelect]);

  // Handle preset save
  const handlePresetSave = useCallback((name: string, description: string, filterGroup: FilterGroup) => {
    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      description,
      filterGroup: { ...filterGroup },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newPresets = [...presets, newPreset];
    setPresets(newPresets);

    // Save to localStorage
    savePreferences(filterState.rootGroup, newPresets.filter(p => !p.isDefault));
    
    toast.success(`Saved "${name}" filter preset`);
  }, [presets, filterState.rootGroup, savePreferences]);

  // Handle preset delete
  const handlePresetDelete = useCallback((presetId: string) => {
    const newPresets = presets.filter(p => p.id !== presetId);
    setPresets(newPresets);

    // Save to localStorage
    savePreferences(filterState.rootGroup, newPresets.filter(p => !p.isDefault));
    
    // Clear active preset if it was deleted
    if (filterState.activePreset === presetId) {
      setFilterState(prev => ({
        ...prev,
        activePreset: undefined,
      }));
    }

    toast.success('Filter preset deleted');
  }, [presets, filterState.rootGroup, filterState.activePreset, savePreferences]);

  // Handle preset update
  const handlePresetUpdate = useCallback((presetId: string, updates: Partial<FilterPreset>) => {
    const newPresets = presets.map(p => 
      p.id === presetId ? { ...p, ...updates } : p
    );
    setPresets(newPresets);

    // Save to localStorage
    savePreferences(filterState.rootGroup, newPresets.filter(p => !p.isDefault));
  }, [presets, filterState.rootGroup, savePreferences]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    handleFilterChange(DEFAULT_FILTER_GROUP);
    setFilterState(prev => ({
      ...prev,
      activePreset: undefined,
    }));
    toast.success('Filters cleared');
  }, [handleFilterChange]);

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    const hasRootCriteria = filterState.rootGroup.criteria.length > 0;
    const hasRootGroups = filterState.rootGroup.groups && filterState.rootGroup.groups.length > 0;
    return hasRootCriteria || hasRootGroups;
  }, [filterState.rootGroup]);

  // Count active filter criteria
  const activeFilterCount = useMemo(() => {
    const countCriteria = (group: FilterGroup): number => {
      let count = group.criteria.length;
      if (group.groups) {
        count += group.groups.reduce((sum, g) => sum + countCriteria(g), 0);
      }
      return count;
    };
    return countCriteria(filterState.rootGroup);
  }, [filterState.rootGroup]);

  // Get quick filter presets
  const quickFilterPresets = useMemo(() => 
    presets.filter(p => p.isQuickFilter), 
    [presets]
  );

  return (
    <div className={cn('advanced-filtering', className)}>
      <Card className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600" />
            <div>
              <h3 className="text-sm font-medium text-slate-900">Advanced Filters</h3>
              <p className="text-xs text-slate-500">
                {hasActiveFilters 
                  ? `${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`
                  : 'No filters applied'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-slate-500 hover:text-slate-700"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-500"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick Filters (Always Visible) */}
        {enableQuickFilters && quickFilterPresets.length > 0 && (
          <div className="mb-4">
            <QuickFilterButtons
              quickFilters={quickFilterPresets}
              onFilterSelect={handlePresetSelect}
              activeFilter={filterState.activePreset}
            />
          </div>
        )}

        {/* Expanded Controls */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <Separator />

              {/* Filter Tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="quick" className="text-xs">
                    Quick Filters
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs">
                    Advanced Logic
                  </TabsTrigger>
                  <TabsTrigger value="presets" className="text-xs">
                    Presets
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="quick" className="space-y-4">
                  {/* All Quick Filters */}
                  <div>
                    <Label className="text-xs font-medium text-slate-600 mb-2 block">
                      All Quick Filters
                    </Label>
                    <QuickFilterButtons
                      quickFilters={presets.filter(p => p.isDefault)}
                      onFilterSelect={handlePresetSelect}
                      activeFilter={filterState.activePreset}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  {enableLogicBuilder && (
                    <FilterLogicBuilder
                      filterGroup={filterState.rootGroup}
                      onGroupChange={handleFilterChange}
                      availableFields={availableFields}
                      maxDepth={maxDepth}
                    />
                  )}
                </TabsContent>

                <TabsContent value="presets" className="space-y-4">
                  {enablePresets && (
                    <FilterPresetManager
                      presets={presets}
                      activePreset={filterState.activePreset}
                      onPresetSelect={handlePresetSelect}
                      onPresetSave={handlePresetSave}
                      onPresetDelete={handlePresetDelete}
                      onPresetUpdate={handlePresetUpdate}
                    />
                  )}
                </TabsContent>
              </Tabs>

              {/* Filter Summary */}
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <Settings className="h-3 w-3" />
                    <span className="font-medium">Active Filters</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {activeFilterCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {filterState.activePreset 
                      ? `Using "${presets.find(p => p.id === filterState.activePreset)?.name}" preset`
                      : 'Custom filter configuration active'
                    }
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

export default AdvancedFiltering;