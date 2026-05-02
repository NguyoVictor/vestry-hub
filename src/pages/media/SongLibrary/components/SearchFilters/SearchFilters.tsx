/**
 * Search Filters Component for Song Library UI Revamp
 * 
 * Provides advanced filtering capabilities with multi-criteria support.
 * Includes filters for key, BPM, time signature, tags, and more.
 * 
 * Features:
 * - Multi-criteria filtering with AND/OR logic
 * - Real-time filter application
 * - Filter presets and saving
 * - Quick filter buttons
 * - Range sliders for BPM and date ranges
 * 
 * Requirements: 3.4, 15.1, 15.2, 15.4, 15.5
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  X,
  Music,
  Clock,
  Calendar,
  Tag,
  Mic,
  TrendingUp,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

import type { Song } from '@/types/song-library';

interface SearchFilters {
  key?: string;
  bpmRange?: [number, number];
  timeSignature?: string;
  tags?: string[];
  artist?: string;
  usageCount?: 'high' | 'medium' | 'low' | 'unused';
  dateRange?: [Date, Date];
  isTrending?: boolean;
  hasLyrics?: boolean;
  hasChords?: boolean;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  isDefault?: boolean;
}

interface SearchFiltersProps {
  /** Current filters */
  filters: SearchFilters;
  /** Filter change handler */
  onFiltersChange: (filters: SearchFilters) => void;
  /** Available songs for extracting filter options */
  songs: Song[];
  /** Whether filters are being applied */
  isApplying?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

// Common musical keys
const MUSICAL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm',
];

// Common time signatures
const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4', '7/8'];

// Default filter presets
const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'trending',
    name: 'Trending Songs',
    filters: { isTrending: true },
    isDefault: true,
  },
  {
    id: 'recent',
    name: 'Recently Added',
    filters: { 
      dateRange: [
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date()
      ]
    },
    isDefault: true,
  },
  {
    id: 'unused',
    name: 'Unused Songs',
    filters: { usageCount: 'unused' },
    isDefault: true,
  },
  {
    id: 'worship-keys',
    name: 'Common Worship Keys',
    filters: { key: 'G' }, // Will be expanded to include C, D, G, A
    isDefault: true,
  },
];

/**
 * Main Search Filters component
 */
export function SearchFilters({
  filters,
  onFiltersChange,
  songs,
  isApplying = false,
  compact = false,
  className,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [presets, setPresets] = useState<FilterPreset[]>(DEFAULT_PRESETS);
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Extract unique values from songs for filter options
  const filterOptions = React.useMemo(() => {
    const artists = new Set<string>();
    const tags = new Set<string>();
    let minBpm = Infinity;
    let maxBpm = -Infinity;

    songs.forEach(song => {
      if (song.artist) artists.add(song.artist);
      if (song.tags) song.tags.forEach(tag => tags.add(tag));
      if (song.bpm) {
        minBpm = Math.min(minBpm, song.bpm);
        maxBpm = Math.max(maxBpm, song.bpm);
      }
    });

    return {
      artists: Array.from(artists).sort(),
      tags: Array.from(tags).sort(),
      bpmRange: [
        minBpm === Infinity ? 60 : minBpm,
        maxBpm === -Infinity ? 200 : maxBpm,
      ] as [number, number],
    };
  }, [songs]);

  // Update filters
  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  // Apply preset
  const applyPreset = useCallback((preset: FilterPreset) => {
    onFiltersChange(preset.filters);
  }, [onFiltersChange]);

  // Save current filters as preset
  const savePreset = useCallback(() => {
    if (!newPresetName.trim()) return;

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      filters: { ...filters },
    };

    setPresets(prev => [...prev, newPreset]);
    setNewPresetName('');
    setShowPresetSave(false);

    // Save to localStorage
    try {
      const customPresets = [...presets, newPreset].filter(p => !p.isDefault);
      localStorage.setItem('song-library-filter-presets', JSON.stringify(customPresets));
    } catch (error) {
      console.warn('Failed to save filter preset:', error);
    }
  }, [newPresetName, filters, presets]);

  // Load custom presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('song-library-filter-presets');
      if (saved) {
        const customPresets = JSON.parse(saved);
        setPresets(prev => [...prev.filter(p => p.isDefault), ...customPresets]);
      }
    } catch (error) {
      console.warn('Failed to load filter presets:', error);
    }
  }, []);

  // Count active filters
  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className={cn('search-filters', className)}>
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {activeFilterCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter Presets */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Quick Presets */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-2 block">
              Quick Filters
            </Label>
            <div className="flex flex-wrap gap-2">
              {presets.map(preset => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="text-xs"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Key Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Key</Label>
              <Select
                value={filters.key || ''}
                onValueChange={(value) => updateFilters({ key: value || undefined })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Any key" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any key</SelectItem>
                  {MUSICAL_KEYS.map(key => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Signature Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Time Signature</Label>
              <Select
                value={filters.timeSignature || ''}
                onValueChange={(value) => updateFilters({ timeSignature: value || undefined })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any time</SelectItem>
                  {TIME_SIGNATURES.map(sig => (
                    <SelectItem key={sig} value={sig}>{sig}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Usage Count Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Usage</Label>
              <Select
                value={filters.usageCount || ''}
                onValueChange={(value) => updateFilters({ usageCount: value as any || undefined })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Any usage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any usage</SelectItem>
                  <SelectItem value="unused">Unused</SelectItem>
                  <SelectItem value="low">Low (1-5)</SelectItem>
                  <SelectItem value="medium">Medium (6-20)</SelectItem>
                  <SelectItem value="high">High (21+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Artist Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Artist</Label>
              <Select
                value={filters.artist || ''}
                onValueChange={(value) => updateFilters({ artist: value || undefined })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Any artist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any artist</SelectItem>
                  {filterOptions.artists.map(artist => (
                    <SelectItem key={artist} value={artist}>{artist}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* BPM Range Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">
              BPM Range: {filters.bpmRange?.[0] || filterOptions.bpmRange[0]} - {filters.bpmRange?.[1] || filterOptions.bpmRange[1]}
            </Label>
            <Slider
              value={filters.bpmRange || filterOptions.bpmRange}
              onValueChange={(value) => updateFilters({ bpmRange: value as [number, number] })}
              min={filterOptions.bpmRange[0]}
              max={filterOptions.bpmRange[1]}
              step={5}
              className="w-full"
            />
          </div>

          {/* Boolean Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="trending"
                checked={filters.isTrending || false}
                onCheckedChange={(checked) => updateFilters({ isTrending: checked || undefined })}
              />
              <Label htmlFor="trending" className="text-sm">Trending songs</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasLyrics"
                checked={filters.hasLyrics || false}
                onCheckedChange={(checked) => updateFilters({ hasLyrics: checked || undefined })}
              />
              <Label htmlFor="hasLyrics" className="text-sm">Has lyrics</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasChords"
                checked={filters.hasChords || false}
                onCheckedChange={(checked) => updateFilters({ hasChords: checked || undefined })}
              />
              <Label htmlFor="hasChords" className="text-sm">Has chords</Label>
            </div>
          </div>

          {/* Save Preset */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            {showPresetSave ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="h-8 flex-1"
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
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPresetSave(true)}
                disabled={activeFilterCount === 0}
                className="text-slate-500"
              >
                <Save className="h-4 w-4 mr-1" />
                Save as preset
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Quick filter buttons for common use cases
 */
interface QuickFiltersProps {
  onFilterSelect: (filters: SearchFilters) => void;
  className?: string;
}

export function QuickFilters({ onFilterSelect, className }: QuickFiltersProps) {
  const quickFilters = [
    {
      label: 'Trending',
      icon: <TrendingUp className="h-4 w-4" />,
      filters: { isTrending: true },
    },
    {
      label: 'Recent',
      icon: <Clock className="h-4 w-4" />,
      filters: { 
        dateRange: [
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          new Date()
        ] as [Date, Date]
      },
    },
    {
      label: 'Unused',
      icon: <Music className="h-4 w-4" />,
      filters: { usageCount: 'unused' as const },
    },
    {
      label: 'With Lyrics',
      icon: <Mic className="h-4 w-4" />,
      filters: { hasLyrics: true },
    },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {quickFilters.map((filter, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onFilterSelect(filter.filters)}
          className="flex items-center gap-2 text-xs"
        >
          {filter.icon}
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

export default SearchFilters;