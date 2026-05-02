/**
 * View Mode Toggle Component for Song Library UI Revamp
 * 
 * Provides smooth switching between:
 * - Grid View: Card-based display with cover art and metadata
 * - List View: Compact tabular display with AnimatedList component
 * 
 * Features:
 * - Animated toggle with Framer Motion
 * - Persists user preference
 * - Maintains scroll position during switches
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ViewMode } from '@/types/song-library';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
  isMobile?: boolean;
}

export function ViewModeToggle({ viewMode, onChange, isMobile = false }: ViewModeToggleProps) {
  return (
    <div className={`relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ${
      isMobile ? 'min-h-[44px]' : ''
    }`}>
      {/* Animated Background */}
      <motion.div
        layoutId="viewModeBackground"
        className="absolute inset-y-1 bg-white dark:bg-slate-700 rounded-md shadow-sm"
        initial={false}
        animate={{
          x: viewMode === 'grid' ? 0 : '100%',
          width: '50%',
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      />

      {/* Grid View Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange('grid')}
        className={`relative z-10 px-3 transition-colors ${
          isMobile ? 'h-10 min-w-[44px]' : 'h-8'
        } ${
          viewMode === 'grid'
            ? 'text-slate-900 dark:text-slate-100'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <Grid3X3 className="h-4 w-4" />
        <span className={`ml-1.5 text-xs font-medium ${isMobile ? 'hidden' : 'hidden sm:inline'}`}>
          Grid
        </span>
      </Button>

      {/* List View Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange('list')}
        className={`relative z-10 px-3 transition-colors ${
          isMobile ? 'h-10 min-w-[44px]' : 'h-8'
        } ${
          viewMode === 'list'
            ? 'text-slate-900 dark:text-slate-100'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        <List className="h-4 w-4" />
        <span className={`ml-1.5 text-xs font-medium ${isMobile ? 'hidden' : 'hidden sm:inline'}`}>
          List
        </span>
      </Button>
    </div>
  );
}

export default ViewModeToggle;