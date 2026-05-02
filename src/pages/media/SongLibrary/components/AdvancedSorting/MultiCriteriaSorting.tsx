/**
 * Multi-Criteria Sorting Component
 * 
 * Provides advanced multi-criteria sorting functionality with:
 * - Drag-and-drop priority reordering
 * - Multiple sort fields with individual directions
 * - Visual priority indicators
 * - Real-time sort preview
 * 
 * Requirements: 15.3, 15.6, 15.7
 */

import React, { useCallback, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import type { SortField, SortDirection } from '@/types/song-library';
import type { SortCriteria, MultiCriteriaSortingProps } from './types';

// Sort field labels and descriptions
const SORT_FIELD_CONFIG: Record<SortField, { label: string; description: string; icon: string }> = {
  title: { label: 'Title', description: 'Song title alphabetically', icon: '🎵' },
  artist: { label: 'Artist', description: 'Artist name alphabetically', icon: '👤' },
  key: { label: 'Key', description: 'Musical key (C, D, E, etc.)', icon: '🎹' },
  bpm: { label: 'BPM', description: 'Beats per minute (tempo)', icon: '⏱️' },
  usage_count: { label: 'Usage Count', description: 'How often song is used', icon: '📊' },
  last_played_at: { label: 'Last Played', description: 'Most recently played', icon: '📅' },
  created_at: { label: 'Date Added', description: 'When song was added', icon: '📝' },
};

/**
 * Individual Sort Criteria Item Component
 */
interface SortCriteriaItemProps {
  criteria: SortCriteria;
  index: number;
  onUpdate: (updates: Partial<SortCriteria>) => void;
  onRemove: () => void;
  canRemove: boolean;
  availableFields: SortField[];
  isDragging?: boolean;
}

function SortCriteriaItem({
  criteria,
  index,
  onUpdate,
  onRemove,
  canRemove,
  availableFields,
  isDragging = false,
}: SortCriteriaItemProps) {
  const fieldConfig = SORT_FIELD_CONFIG[criteria.field];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
      className={cn(
        'group relative bg-white border border-slate-200 rounded-lg p-3 transition-all duration-200',
        isDragging && 'shadow-lg border-orange-300',
        'hover:border-slate-300 hover:shadow-sm'
      )}
    >
      {/* Drag Handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-slate-400" />
      </div>

      <div className="flex items-center gap-3 ml-6">
        {/* Priority Badge */}
        <Badge 
          variant="outline" 
          className={cn(
            'w-6 h-6 flex items-center justify-center text-xs font-bold',
            index === 0 && 'bg-orange-100 text-orange-700 border-orange-300',
            index === 1 && 'bg-blue-100 text-blue-700 border-blue-300',
            index === 2 && 'bg-emerald-100 text-emerald-700 border-emerald-300'
          )}
        >
          {index + 1}
        </Badge>

        {/* Field Icon & Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{fieldConfig.icon}</span>
          <div className="flex-1 min-w-0">
            <Select
              value={criteria.field}
              onValueChange={(field) => onUpdate({ field: field as SortField })}
            >
              <SelectTrigger className="h-8 border-0 shadow-none p-0 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => {
                  const config = SORT_FIELD_CONFIG[field];
                  return (
                    <SelectItem key={field} value={field}>
                      <div className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <div>
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-slate-500">{config.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 truncate">{fieldConfig.description}</p>
          </div>
        </div>

        {/* Direction Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdate({ 
            direction: criteria.direction === 'asc' ? 'desc' : 'asc' 
          })}
          className="h-8 px-2 shrink-0"
        >
          {criteria.direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs">
            {criteria.direction === 'asc' ? 'A→Z' : 'Z→A'}
          </span>
        </Button>

        {/* Remove Button */}
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Main Multi-Criteria Sorting Component
 */
export function MultiCriteriaSorting({
  criteria,
  onCriteriaChange,
  availableFields,
  maxCriteria = 3,
  className,
}: MultiCriteriaSortingProps) {
  const [showPreview, setShowPreview] = useState(false);

  // Add new criteria
  const addCriteria = useCallback(() => {
    if (criteria.length >= maxCriteria) return;

    // Find first unused field
    const usedFields = new Set(criteria.map(c => c.field));
    const availableField = availableFields.find(field => !usedFields.has(field)) || availableFields[0];

    const newCriteria: SortCriteria = {
      field: availableField,
      direction: 'asc',
      priority: criteria.length + 1,
    };

    onCriteriaChange([...criteria, newCriteria]);
  }, [criteria, availableFields, maxCriteria, onCriteriaChange]);

  // Remove criteria
  const removeCriteria = useCallback((index: number) => {
    const newCriteria = criteria.filter((_, i) => i !== index);
    // Reorder priorities
    const reorderedCriteria = newCriteria.map((c, i) => ({
      ...c,
      priority: i + 1,
    }));
    onCriteriaChange(reorderedCriteria);
  }, [criteria, onCriteriaChange]);

  // Update criteria
  const updateCriteria = useCallback((index: number, updates: Partial<SortCriteria>) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    onCriteriaChange(newCriteria);
  }, [criteria, onCriteriaChange]);

  // Handle reorder from drag and drop
  const handleReorder = useCallback((newOrder: SortCriteria[]) => {
    // Update priorities based on new order
    const reorderedCriteria = newOrder.map((criteria, index) => ({
      ...criteria,
      priority: index + 1,
    }));
    onCriteriaChange(reorderedCriteria);
  }, [onCriteriaChange]);

  const canAddMore = criteria.length < maxCriteria;
  const canRemove = criteria.length > 1;

  return (
    <div className={cn('multi-criteria-sorting space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-slate-900">
            Sort Criteria
          </Label>
          <p className="text-xs text-slate-500 mt-0.5">
            Drag to reorder priority • {criteria.length}/{maxCriteria} criteria
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span className="ml-1">{showPreview ? 'Hide' : 'Show'} Preview</span>
          </Button>

          {canAddMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={addCriteria}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Criteria
            </Button>
          )}
        </div>
      </div>

      {/* Sort Criteria List */}
      <Reorder.Group
        axis="y"
        values={criteria}
        onReorder={handleReorder}
        className="space-y-2"
      >
        <AnimatePresence>
          {criteria.map((criteriaItem, index) => (
            <Reorder.Item
              key={`${criteriaItem.field}-${index}`}
              value={criteriaItem}
              className="cursor-grab active:cursor-grabbing"
            >
              <SortCriteriaItem
                criteria={criteriaItem}
                index={index}
                onUpdate={(updates) => updateCriteria(index, updates)}
                onRemove={() => removeCriteria(index)}
                canRemove={canRemove}
                availableFields={availableFields}
              />
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Sort Preview */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-3 bg-slate-50 border-slate-200">
              <Label className="text-xs font-medium text-slate-600 mb-2 block">
                Sort Preview
              </Label>
              <div className="text-xs text-slate-600 space-y-1">
                {criteria.map((c, index) => {
                  const config = SORT_FIELD_CONFIG[c.field];
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="w-4 h-4 text-xs p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span>
                        Sort by <strong>{config.label}</strong> ({c.direction === 'asc' ? 'ascending' : 'descending'})
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Text */}
      {criteria.length === 1 && (
        <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <strong>💡 Tip:</strong> Add multiple criteria to sort by priority. For example, sort by "Usage Count" first, 
          then by "Title" to organize frequently used songs alphabetically.
        </div>
      )}
    </div>
  );
}

export default MultiCriteriaSorting;