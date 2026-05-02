/**
 * Quick Filter Buttons Component
 * 
 * Provides one-click filter buttons for common filtering scenarios:
 * - Predefined filter combinations
 * - Visual filter indicators
 * - Quick access to popular filters
 * 
 * Requirements: 15.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import type { QuickFilterButtonsProps } from './types';

/**
 * Quick Filter Buttons Component
 */
export function QuickFilterButtons({
  quickFilters,
  onFilterSelect,
  activeFilter,
  className,
}: QuickFilterButtonsProps) {
  if (quickFilters.length === 0) {
    return null;
  }

  return (
    <div className={cn('quick-filter-buttons', className)}>
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter, index) => {
          const isActive = activeFilter === filter.id;
          
          return (
            <motion.div
              key={filter.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterSelect(filter)}
                className={cn(
                  'flex items-center gap-2 text-xs transition-all duration-200',
                  isActive && 'shadow-md',
                  filter.color && !isActive && `hover:border-${filter.color}-300 hover:text-${filter.color}-700`,
                  filter.color && isActive && `bg-${filter.color}-500 hover:bg-${filter.color}-600`
                )}
              >
                {filter.icon && (
                  <span className="text-sm">{filter.icon}</span>
                )}
                <span>{filter.name}</span>
                {isActive && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-white/20">
                    Active
                  </Badge>
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default QuickFilterButtons;