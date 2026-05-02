/**
 * Filter Logic Builder Component
 * 
 * Provides advanced filtering with AND/OR logic support:
 * - Visual filter group builder
 * - Nested filter groups with logic operators
 * - Dynamic criteria addition/removal
 * - Real-time filter preview
 * 
 * Requirements: 15.1, 15.2
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
// import { DatePicker } from '@/components/ui/date-picker'; // Component doesn't exist yet

import type { 
  FilterGroup, 
  FilterCriteria, 
  FilterLogic, 
  FilterField, 
  FilterOperator, 
  FilterValue,
  FilterLogicBuilderProps 
} from './types';

// Operator configurations
const OPERATOR_CONFIG: Record<FilterOperator, { 
  label: string; 
  description: string; 
  requiresValue: boolean;
  valueType?: 'single' | 'range' | 'array';
}> = {
  equals: { label: 'Equals', description: 'Exact match', requiresValue: true },
  not_equals: { label: 'Not Equals', description: 'Does not match', requiresValue: true },
  contains: { label: 'Contains', description: 'Contains text', requiresValue: true },
  not_contains: { label: 'Does Not Contain', description: 'Does not contain text', requiresValue: true },
  starts_with: { label: 'Starts With', description: 'Begins with text', requiresValue: true },
  ends_with: { label: 'Ends With', description: 'Ends with text', requiresValue: true },
  greater_than: { label: 'Greater Than', description: 'Larger than value', requiresValue: true },
  less_than: { label: 'Less Than', description: 'Smaller than value', requiresValue: true },
  greater_than_or_equal: { label: 'Greater Than or Equal', description: 'At least value', requiresValue: true },
  less_than_or_equal: { label: 'Less Than or Equal', description: 'At most value', requiresValue: true },
  between: { label: 'Between', description: 'Within range', requiresValue: true, valueType: 'range' },
  in: { label: 'In List', description: 'Matches any in list', requiresValue: true, valueType: 'array' },
  not_in: { label: 'Not In List', description: 'Does not match any in list', requiresValue: true, valueType: 'array' },
  is_empty: { label: 'Is Empty', description: 'Has no value', requiresValue: false },
  is_not_empty: { label: 'Is Not Empty', description: 'Has a value', requiresValue: false },
  is_true: { label: 'Is True', description: 'Boolean is true', requiresValue: false },
  is_false: { label: 'Is False', description: 'Boolean is false', requiresValue: false },
};

/**
 * Individual Filter Criteria Component
 */
interface FilterCriteriaItemProps {
  criteria: FilterCriteria;
  availableFields: FilterField[];
  onUpdate: (updates: Partial<FilterCriteria>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function FilterCriteriaItem({
  criteria,
  availableFields,
  onUpdate,
  onRemove,
  canRemove,
}: FilterCriteriaItemProps) {
  const field = availableFields.find(f => f.key === criteria.field);
  const operatorConfig = OPERATOR_CONFIG[criteria.operator];

  // Get available operators for current field
  const availableOperators = field?.operators || ['equals', 'not_equals'];

  // Render value input based on field type and operator
  const renderValueInput = () => {
    if (!operatorConfig.requiresValue) return null;
    if (!field) return null;

    const commonProps = {
      className: "h-8",
      onChange: (value: FilterValue) => onUpdate({ value }),
    };

    switch (field.type) {
      case 'string':
        return (
          <Input
            value={criteria.value as string || ''}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            className="h-8 flex-1"
          />
        );

      case 'number':
        if (operatorConfig.valueType === 'range') {
          const rangeValue = Array.isArray(criteria.value) ? criteria.value as number[] : [0, 100];
          return (
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                value={rangeValue[0] || ''}
                onChange={(e) => onUpdate({ value: [Number(e.target.value), rangeValue[1]] })}
                placeholder="Min"
                className="h-8 w-20"
              />
              <span className="text-xs text-slate-500">to</span>
              <Input
                type="number"
                value={rangeValue[1] || ''}
                onChange={(e) => onUpdate({ value: [rangeValue[0], Number(e.target.value)] })}
                placeholder="Max"
                className="h-8 w-20"
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={criteria.value as number || ''}
            onChange={(e) => onUpdate({ value: Number(e.target.value) })}
            placeholder={field.placeholder || '0'}
            className="h-8 w-24"
          />
        );

      case 'boolean':
        return (
          <Select
            value={criteria.value?.toString() || ''}
            onValueChange={(value) => onUpdate({ value: value === 'true' })}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'select':
        return (
          <Select
            value={criteria.value as string || ''}
            onValueChange={(value) => onUpdate({ value })}
          >
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(criteria.value) ? criteria.value as string[] : [];
        return (
          <div className="flex flex-wrap gap-1 flex-1">
            {field.options?.map(option => {
              const isSelected = selectedValues.includes(option.value.toString());
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== option.value.toString())
                      : [...selectedValues, option.value.toString()];
                    onUpdate({ value: newValues });
                  }}
                  className="h-6 text-xs"
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        );

      case 'date':
        // TODO: Implement DatePicker component or use a simple input
        return (
          <Input
            type="date"
            value={criteria.value ? new Date(criteria.value as Date).toISOString().split('T')[0] : ''}
            onChange={(e) => onUpdate({ value: e.target.value ? new Date(e.target.value) : null })}
            className="h-8"
          />
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg group hover:border-slate-300 transition-colors"
    >
      {/* Field Selection */}
      <Select
        value={criteria.field}
        onValueChange={(field) => {
          const newField = availableFields.find(f => f.key === field);
          const defaultOperator = newField?.operators[0] || 'equals';
          onUpdate({ field, operator: defaultOperator, value: null });
        }}
      >
        <SelectTrigger className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map(field => (
            <SelectItem key={field.key} value={field.key}>
              <div>
                <div className="font-medium">{field.label}</div>
                {field.description && (
                  <div className="text-xs text-slate-500">{field.description}</div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Selection */}
      <Select
        value={criteria.operator}
        onValueChange={(operator) => onUpdate({ operator: operator as FilterOperator, value: null })}
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map(operator => {
            const config = OPERATOR_CONFIG[operator];
            return (
              <SelectItem key={operator} value={operator}>
                <div>
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-slate-500">{config.description}</div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Value Input */}
      {renderValueInput()}

      {/* Remove Button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}

/**
 * Filter Group Component (supports nesting)
 */
interface FilterGroupItemProps {
  group: FilterGroup;
  availableFields: FilterField[];
  onGroupChange: (group: FilterGroup) => void;
  onRemove?: () => void;
  canRemove: boolean;
  maxDepth: number;
  currentDepth: number;
}

function FilterGroupItem({
  group,
  availableFields,
  onGroupChange,
  onRemove,
  canRemove,
  maxDepth,
  currentDepth,
}: FilterGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Add new criteria
  const addCriteria = useCallback(() => {
    const newCriteria: FilterCriteria = {
      id: `criteria-${Date.now()}`,
      field: availableFields[0]?.key || '',
      operator: availableFields[0]?.operators[0] || 'equals',
      value: null,
    };

    onGroupChange({
      ...group,
      criteria: [...group.criteria, newCriteria],
    });
  }, [group, availableFields, onGroupChange]);

  // Remove criteria
  const removeCriteria = useCallback((criteriaId: string) => {
    onGroupChange({
      ...group,
      criteria: group.criteria.filter(c => c.id !== criteriaId),
    });
  }, [group, onGroupChange]);

  // Update criteria
  const updateCriteria = useCallback((criteriaId: string, updates: Partial<FilterCriteria>) => {
    onGroupChange({
      ...group,
      criteria: group.criteria.map(c => 
        c.id === criteriaId ? { ...c, ...updates } : c
      ),
    });
  }, [group, onGroupChange]);

  // Add nested group
  const addNestedGroup = useCallback(() => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      logic: 'AND',
      criteria: [],
      groups: [],
    };

    onGroupChange({
      ...group,
      groups: [...(group.groups || []), newGroup],
    });
  }, [group, onGroupChange]);

  // Remove nested group
  const removeNestedGroup = useCallback((groupId: string) => {
    onGroupChange({
      ...group,
      groups: (group.groups || []).filter(g => g.id !== groupId),
    });
  }, [group, onGroupChange]);

  // Update nested group
  const updateNestedGroup = useCallback((groupId: string, updatedGroup: FilterGroup) => {
    onGroupChange({
      ...group,
      groups: (group.groups || []).map(g => 
        g.id === groupId ? updatedGroup : g
      ),
    });
  }, [group, onGroupChange]);

  // Toggle logic
  const toggleLogic = useCallback(() => {
    onGroupChange({
      ...group,
      logic: group.logic === 'AND' ? 'OR' : 'AND',
    });
  }, [group, onGroupChange]);

  const hasContent = group.criteria.length > 0 || (group.groups && group.groups.length > 0);
  const canAddNestedGroup = currentDepth < maxDepth;

  return (
    <Card className={cn(
      'p-3 border-l-4 transition-colors',
      group.logic === 'AND' ? 'border-l-blue-400 bg-blue-50/30' : 'border-l-orange-400 bg-orange-50/30',
      currentDepth > 0 && 'ml-4'
    )}>
      {/* Group Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>

          <Badge 
            variant="outline" 
            className={cn(
              'cursor-pointer transition-colors',
              group.logic === 'AND' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-orange-100 text-orange-700 border-orange-300'
            )}
            onClick={toggleLogic}
          >
            {group.logic}
          </Badge>

          <span className="text-xs text-slate-600">
            {currentDepth > 0 ? 'Nested Group' : 'Filter Group'}
          </span>

          {hasContent && (
            <Badge variant="secondary" className="text-xs">
              {group.criteria.length + (group.groups?.length || 0)} items
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={addCriteria}
            className="h-6 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Criteria
          </Button>

          {canAddNestedGroup && (
            <Button
              variant="ghost"
              size="sm"
              onClick={addNestedGroup}
              className="h-6 px-2 text-xs"
            >
              <Layers className="h-3 w-3 mr-1" />
              Group
            </Button>
          )}

          {canRemove && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 px-2 text-slate-400 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Group Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {/* Criteria */}
            {group.criteria.map((criteria, index) => (
              <div key={criteria.id}>
                {index > 0 && (
                  <div className="flex items-center justify-center py-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        group.logic === 'AND' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                      )}
                    >
                      {group.logic}
                    </Badge>
                  </div>
                )}
                <FilterCriteriaItem
                  criteria={criteria}
                  availableFields={availableFields}
                  onUpdate={(updates) => updateCriteria(criteria.id, updates)}
                  onRemove={() => removeCriteria(criteria.id)}
                  canRemove={group.criteria.length > 1 || (group.groups && group.groups.length > 0)}
                />
              </div>
            ))}

            {/* Nested Groups */}
            {group.groups?.map((nestedGroup, index) => (
              <div key={nestedGroup.id}>
                {(group.criteria.length > 0 || index > 0) && (
                  <div className="flex items-center justify-center py-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        group.logic === 'AND' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                      )}
                    >
                      {group.logic}
                    </Badge>
                  </div>
                )}
                <FilterGroupItem
                  group={nestedGroup}
                  availableFields={availableFields}
                  onGroupChange={(updatedGroup) => updateNestedGroup(nestedGroup.id, updatedGroup)}
                  onRemove={() => removeNestedGroup(nestedGroup.id)}
                  canRemove={true}
                  maxDepth={maxDepth}
                  currentDepth={currentDepth + 1}
                />
              </div>
            ))}

            {/* Empty State */}
            {!hasContent && (
              <div className="text-center py-4 text-slate-500">
                <Filter className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No filters added yet</p>
                <p className="text-xs">Click "Criteria" to add your first filter</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/**
 * Main Filter Logic Builder Component
 */
export function FilterLogicBuilder({
  filterGroup,
  onGroupChange,
  availableFields,
  maxDepth = 3,
  currentDepth = 0,
  className,
}: FilterLogicBuilderProps) {
  const [showPreview, setShowPreview] = useState(false);

  // Generate human-readable filter description
  const generateFilterDescription = useCallback((group: FilterGroup, depth = 0): string => {
    const indent = '  '.repeat(depth);
    let description = '';

    if (group.criteria.length > 0) {
      const criteriaDescriptions = group.criteria.map(criteria => {
        const field = availableFields.find(f => f.key === criteria.field);
        const operator = OPERATOR_CONFIG[criteria.operator];
        const fieldLabel = field?.label || criteria.field;
        
        let valueStr = '';
        if (operator.requiresValue && criteria.value !== null) {
          if (Array.isArray(criteria.value)) {
            valueStr = criteria.value.join(', ');
          } else {
            valueStr = criteria.value.toString();
          }
        }

        return `${fieldLabel} ${operator.label.toLowerCase()}${valueStr ? ` "${valueStr}"` : ''}`;
      });

      description += criteriaDescriptions.join(` ${group.logic} `);
    }

    if (group.groups && group.groups.length > 0) {
      const groupDescriptions = group.groups.map(g => 
        `(${generateFilterDescription(g, depth + 1)})`
      );
      
      if (description) {
        description += ` ${group.logic} `;
      }
      description += groupDescriptions.join(` ${group.logic} `);
    }

    return description;
  }, [availableFields]);

  return (
    <div className={cn('filter-logic-builder space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-slate-900">
            Advanced Filters
          </Label>
          <p className="text-xs text-slate-500 mt-0.5">
            Build complex filters with AND/OR logic
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs"
        >
          {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          <span className="ml-1">{showPreview ? 'Hide' : 'Show'} Preview</span>
        </Button>
      </div>

      {/* Filter Builder */}
      <FilterGroupItem
        group={filterGroup}
        availableFields={availableFields}
        onGroupChange={onGroupChange}
        canRemove={false}
        maxDepth={maxDepth}
        currentDepth={currentDepth}
      />

      {/* Filter Preview */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-3 bg-slate-50 border-slate-200">
              <Label className="text-xs font-medium text-slate-600 mb-2 block">
                Filter Logic Preview
              </Label>
              <div className="text-xs text-slate-700 font-mono bg-white p-2 rounded border">
                {generateFilterDescription(filterGroup) || 'No filters applied'}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Text */}
      <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Zap className="h-3 w-3 mt-0.5 text-blue-500" />
          <div>
            <strong>Logic Tips:</strong>
            <ul className="mt-1 space-y-0.5 ml-2">
              <li>• <strong>AND</strong>: All conditions must be true (more restrictive)</li>
              <li>• <strong>OR</strong>: Any condition can be true (more inclusive)</li>
              <li>• Click logic badges to toggle between AND/OR</li>
              <li>• Use nested groups for complex logic like: (A AND B) OR (C AND D)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilterLogicBuilder;