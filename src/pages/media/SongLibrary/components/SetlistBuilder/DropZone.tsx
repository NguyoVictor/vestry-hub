/**
 * Drop Zone Component
 * 
 * Provides visual drop zones for adding songs to setlists and reordering items.
 * Shows visual feedback during drag operations.
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowDown } from 'lucide-react';

interface DropZoneProps {
  id: string;
  position: number;
  isActive: boolean;
  isOver: boolean;
  acceptedTypes: ('song' | 'setlist_item')[];
  showIndicator?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function DropZone({
  id,
  position,
  isActive,
  isOver,
  acceptedTypes,
  showIndicator = true,
  className = '',
  children,
}: DropZoneProps) {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: 'drop_zone',
      position,
      accepts: acceptedTypes,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative transition-all duration-200
        ${className}
      `}
    >
      {children}
      
      {/* Drop Indicator */}
      <AnimatePresence>
        {showIndicator && (isActive || isOver) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`
              flex items-center justify-center py-3 mx-4 rounded-lg border-2 border-dashed transition-colors
              ${isOver 
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' 
                : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
              }
            `}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              {acceptedTypes.includes('song') && (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Drop song here to add to setlist</span>
                </>
              )}
              {acceptedTypes.includes('setlist_item') && (
                <>
                  <ArrowDown className="h-4 w-4" />
                  <span>Drop to reorder</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Insertion Drop Zone
 * 
 * Specialized drop zone for inserting items at specific positions
 */
interface InsertionDropZoneProps {
  position: number;
  isVisible: boolean;
  isOver: boolean;
  className?: string;
}

export function InsertionDropZone({
  position,
  isVisible,
  isOver,
  className = '',
}: InsertionDropZoneProps) {
  const { setNodeRef } = useDroppable({
    id: `setlist-position-${position}`,
    data: {
      type: 'insertion_zone',
      position,
    },
  });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={setNodeRef}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0 }}
          transition={{ duration: 0.15 }}
          className={`
            h-2 mx-4 rounded-full transition-colors origin-center
            ${isOver 
              ? 'bg-orange-400 shadow-lg shadow-orange-200' 
              : 'bg-slate-300 dark:bg-slate-600'
            }
            ${className}
          `}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Empty Setlist Drop Zone
 * 
 * Large drop zone shown when setlist is empty
 */
interface EmptySetlistDropZoneProps {
  isOver: boolean;
  onDrop?: () => void;
}

export function EmptySetlistDropZone({
  isOver,
}: EmptySetlistDropZoneProps) {
  const { setNodeRef } = useDroppable({
    id: 'empty-setlist-drop-zone',
    data: {
      type: 'empty_setlist',
      position: 0,
    },
  });

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex flex-col items-center justify-center py-16 px-8 rounded-xl border-2 border-dashed transition-all duration-200
        ${isOver 
          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 scale-105' 
          : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
        }
      `}
    >
      <motion.div
        animate={isOver ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: isOver ? Infinity : 0 }}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors
          ${isOver 
            ? 'bg-orange-100 dark:bg-orange-900/40' 
            : 'bg-slate-100 dark:bg-slate-700'
          }
        `}
      >
        <Plus className={`
          h-8 w-8 transition-colors
          ${isOver 
            ? 'text-orange-600 dark:text-orange-400' 
            : 'text-slate-400 dark:text-slate-500'
          }
        `} />
      </motion.div>
      
      <h3 className={`
        text-lg font-semibold mb-2 transition-colors
        ${isOver 
          ? 'text-orange-900 dark:text-orange-100' 
          : 'text-slate-600 dark:text-slate-300'
        }
      `}>
        {isOver ? 'Drop to add song' : 'Empty setlist'}
      </h3>
      
      <p className={`
        text-sm text-center max-w-sm transition-colors
        ${isOver 
          ? 'text-orange-700 dark:text-orange-200' 
          : 'text-slate-500 dark:text-slate-400'
        }
      `}>
        {isOver 
          ? 'Release to add this song to your setlist'
          : 'Drag songs from your library here to start building your setlist'
        }
      </p>
    </motion.div>
  );
}

export default DropZone;