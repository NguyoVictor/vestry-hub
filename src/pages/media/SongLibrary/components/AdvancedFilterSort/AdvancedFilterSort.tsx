/**
 * Advanced Filter and Sort Integration Component
 * 
 * Combines advanced filtering and sorting into a unified interface:
 * - Integrated filter and sort controls
 * - Combined result management
 * - Unified state persistence
 * - Performance optimizations
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.6, 15.7
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ArrowUpDown, Settings, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { AdvancedFiltering } from '../AdvancedFiltering';
import { AdvancedSorting } from '../AdvancedSorting';
import { useAdvancedFilterSort } from '../../hooks/useAdvancedFilterSort';
import type { AdvancedFilterSortProps, FilterSortState } from './types';

/**
 * Main Advanced Filter and Sort Component
 */
export function AdvancedFilterSort({
  songs,
  onResultsChange,
  initialFilters,
  initialSort,
  enablePersistence = true,
  enableQuickActions = true,
  className,
}: AdvancedFilterSortProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'sorting' | 'combined'>('filters');

  // Use the advanced filter/sort hook
  const {
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
    availableFields,
    isProcessing,
  } = useAdvancedFilterSort({
    songs,
    initialFilters,
    initialSort,
    enablePersistence,
  });

  // Create state object for parent component
  const currentState: FilterSortState = {
    filterGroup,
    sortCriteria,
    resultCount: stats.filtered,
    isProcessing,
  };

  // Notify parent of results changes
  useEffect(() => {
    onResultsChange(filteredSongs, currentState);
  }, [filteredSongs, currentState, onResultsChange]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilterGroup: any) => {
    setFilterGroup(newFilterGroup);
  }, [setFilterGroup]);

  // Handle sort changes
  const handleSortChange = useCallback((newSortCriteria: any) => {
    setSortCriteria(newSortCriteria);
  }, [setSortCriteria]);

  // Check if any filters or sorting is active
  const hasActiveFilters = filterGroup.criteria.length > 0 || (filterGroup.groups && filterGroup.groups.length > 0);
  const hasActiveSorting = sortCriteria.length > 1 || 
    (sortCriteria.length === 1 && (sortCriteria[0].field !== 'title' || sortCriteria[0].direction !== 'asc'));

  const hasAnyActive = hasActiveFilters || hasActiveSorting;

  // Count active items
  const activeFilterCount = filterGroup.criteria.length + (filterGroup.groups?.length || 0);
  const activeSortCount = sortCriteria.length;

  return (
    <div className={cn('advanced-filter-sort', className)}>
      <Card className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <ArrowUpDown className="h-4 w-4 text-slate-600" />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-slate-900">
                Filter & Sort
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  {stats.filtered} of {stats.total} songs
                </span>
                {stats.percentage < 100 && (
                  <>
                    <span>•</span>
                    <span>{stats.percentage}% shown</span>
                  </>
                )}
              </div>
            </div>

            {/* Active Indicators */}
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  {activeFilterCount}
                </Badge>
              )}
              {hasActiveSorting && (
                <Badge variant="secondary" className="text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  {activeSortCount}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            {enableQuickActions && hasAnyActive && (
              <div className="flex items-center gap-1">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Clear Filters
                  </Button>
                )}
                {hasActiveSorting && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSort}
                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Clear Sort
                  </Button>
                )}
                {hasActiveFilters && hasActiveSorting && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="h-7 px-2 text-xs text-slate-500 hover:text-red-600"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Expand/Collapse */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8"
            >
              <Settings className="h-3 w-3 mr-1" />
              {isExpanded ? 'Hide' : 'Show'} Controls
            </Button>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
              <span>Processing filters and sorting...</span>
            </div>
          </motion.div>
        )}

        {/* Validation Errors */}
        {!isValid && filterErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <X className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Filter Validation Errors</p>
                <ul className="mt-1 text-xs text-red-700 space-y-0.5">
                  {filterErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
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

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="filters" className="text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sorting" className="text-xs">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    Sorting
                    {hasActiveSorting && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {activeSortCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="combined" className="text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    Combined
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="space-y-4">
                  <AdvancedFiltering
                    onFilterChange={handleFilterChange}
                    initialFilters={filterGroup}
                    availableFields={availableFields}
                    enableLogicBuilder={true}
                    enablePresets={true}
                    enableQuickFilters={true}
                    maxDepth={3}
                  />
                </TabsContent>

                <TabsContent value="sorting" className="space-y-4">
                  <AdvancedSorting
                    onSortChange={handleSortChange}
                    initialCriteria={sortCriteria}
                    enableMultiSort={true}
                    enablePresets={true}
                    maxCriteria={3}
                  />
                </TabsContent>

                <TabsContent value="combined" className="space-y-6">
                  {/* Combined View with Both Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 mb-3">Filtering</h4>
                      <AdvancedFiltering
                        onFilterChange={handleFilterChange}
                        initialFilters={filterGroup}
                        availableFields={availableFields}
                        enableLogicBuilder={true}
                        enablePresets={true}
                        enableQuickFilters={true}
                        maxDepth={2}
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 mb-3">Sorting</h4>
                      <AdvancedSorting
                        onSortChange={handleSortChange}
                        initialCriteria={sortCriteria}
                        enableMultiSort={true}
                        enablePresets={true}
                        maxCriteria={3}
                      />
                    </div>
                  </div>

                  {/* Combined Statistics */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <h5 className="text-sm font-medium text-slate-900 mb-2">Result Summary</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500">Total Songs:</span>
                        <span className="ml-1 font-medium">{stats.total}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Filtered:</span>
                        <span className="ml-1 font-medium">{stats.filtered}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Percentage:</span>
                        <span className="ml-1 font-medium">{stats.percentage}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Status:</span>
                        <span className={cn(
                          "ml-1 font-medium",
                          isValid ? "text-emerald-600" : "text-red-600"
                        )}>
                          {isValid ? 'Valid' : 'Invalid'}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

export default AdvancedFilterSort;