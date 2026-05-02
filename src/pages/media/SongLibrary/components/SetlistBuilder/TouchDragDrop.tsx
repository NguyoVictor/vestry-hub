/**
 * Touch-Optimized Drag and Drop for Mobile Setlist Builder
 * 
 * Provides touch-friendly drag-and-drop functionality with:
 * - Long press activation to prevent accidental drags
 * - Visual feedback during drag operations
 * - Haptic feedback for touch interactions
 * - Auto-scroll when dragging near edges
 * - Touch-optimized drop zones
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { GripVertical, Move, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { triggerHapticFeedback } from '../../utils/mobileUtils';
import type { Song, SetlistItem } from '@/types/song-library';

interface TouchDragDropProps {
  items: SetlistItem[];
  songs: Song[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (itemId: string) => void;
  isTouch: boolean;
  containerRef?: React.RefObject<HTMLElement>;
}

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  draggedItem: SetlistItem | null;
  dragOffset: { x: number; y: number };
  dropIndex: number | null;
}

export function TouchDragDrop({
  items,
  songs,
  onReorder,
  onRemove,
  isTouch,
  containerRef
}: TouchDragDropProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },
    dropIndex: null,
  });

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoScrollTimer, setAutoScrollTimer] = useState<NodeJS.Timeout | null>(null);
  const dragElementRef = useRef<HTMLDivElement>(null);

  // Get song data for an item
  const getSongForItem = useCallback((item: SetlistItem) => {
    return songs.find(song => song.id === item.songId);
  }, [songs]);

  // Handle long press start (touch devices)
  const handleTouchStart = useCallback((e: React.TouchEvent, item: SetlistItem, index: number) => {
    if (!isTouch) return;

    const touch = e.touches[0];
    const timer = setTimeout(() => {
      // Trigger haptic feedback for long press
      triggerHapticFeedback('medium');
      
      setDragState({
        isDragging: true,
        draggedIndex: index,
        draggedItem: item,
        dragOffset: { x: 0, y: 0 },
        dropIndex: null,
      });
    }, 500); // 500ms long press

    setLongPressTimer(timer);
  }, [isTouch]);

  // Handle touch move during drag
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.isDragging || !dragState.draggedItem) return;

    e.preventDefault();
    const touch = e.touches[0];
    
    // Calculate drop index based on touch position
    const elements = document.querySelectorAll('[data-setlist-item]');
    let newDropIndex = dragState.draggedIndex;

    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      
      if (touch.clientY < centerY && index < dragState.draggedIndex!) {
        newDropIndex = index;
      } else if (touch.clientY > centerY && index > dragState.draggedIndex!) {
        newDropIndex = index;
      }
    });

    setDragState(prev => ({
      ...prev,
      dropIndex: newDropIndex,
      dragOffset: {
        x: touch.clientX - (dragElementRef.current?.getBoundingClientRect().left || 0),
        y: touch.clientY - (dragElementRef.current?.getBoundingClientRect().top || 0),
      }
    }));

    // Auto-scroll when near edges
    const scrollContainer = containerRef?.current;
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const scrollThreshold = 100;
      
      if (touch.clientY < containerRect.top + scrollThreshold) {
        // Scroll up
        if (!autoScrollTimer) {
          const timer = setInterval(() => {
            scrollContainer.scrollTop -= 10;
          }, 16);
          setAutoScrollTimer(timer);
        }
      } else if (touch.clientY > containerRect.bottom - scrollThreshold) {
        // Scroll down
        if (!autoScrollTimer) {
          const timer = setInterval(() => {
            scrollContainer.scrollTop += 10;
          }, 16);
          setAutoScrollTimer(timer);
        }
      } else {
        // Stop auto-scroll
        if (autoScrollTimer) {
          clearInterval(autoScrollTimer);
          setAutoScrollTimer(null);
        }
      }
    }
  }, [dragState, containerRef, autoScrollTimer]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // Clear auto-scroll timer
    if (autoScrollTimer) {
      clearInterval(autoScrollTimer);
      setAutoScrollTimer(null);
    }

    if (dragState.isDragging && dragState.draggedIndex !== null && dragState.dropIndex !== null) {
      if (dragState.draggedIndex !== dragState.dropIndex) {
        // Trigger haptic feedback for successful drop
        triggerHapticFeedback('medium');
        onReorder(dragState.draggedIndex, dragState.dropIndex);
      } else {
        // Trigger light feedback for cancelled drop
        triggerHapticFeedback('light');
      }
    }

    setDragState({
      isDragging: false,
      draggedIndex: null,
      draggedItem: null,
      dragOffset: { x: 0, y: 0 },
      dropIndex: null,
    });
  }, [longPressTimer, autoScrollTimer, dragState, onReorder]);

  // Handle mouse events for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent, item: SetlistItem, index: number) => {
    if (isTouch) return;

    setDragState({
      isDragging: true,
      draggedIndex: index,
      draggedItem: item,
      dragOffset: { x: 0, y: 0 },
      dropIndex: null,
    });
  }, [isTouch]);

  // Handle pan for Framer Motion
  const handlePan = useCallback((event: any, info: PanInfo) => {
    if (!dragState.isDragging) return;

    setDragState(prev => ({
      ...prev,
      dragOffset: { x: info.offset.x, y: info.offset.y }
    }));
  }, [dragState.isDragging]);

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    if (!isTouch) {
      handleTouchEnd();
    }
  }, [isTouch, handleTouchEnd]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      if (autoScrollTimer) clearInterval(autoScrollTimer);
    };
  }, [longPressTimer, autoScrollTimer]);

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((item, index) => {
          const song = getSongForItem(item);
          const isDragged = dragState.draggedIndex === index;
          const isDropTarget = dragState.dropIndex === index && dragState.isDragging;
          
          if (!song) return null;

          return (
            <React.Fragment key={item.id}>
              {/* Drop indicator */}
              {isDropTarget && dragState.draggedIndex !== index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 4 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-orange-500 rounded-full mx-4"
                />
              )}

              <motion.div
                ref={isDragged ? dragElementRef : undefined}
                data-setlist-item
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: isDragged ? 0.8 : 1, 
                  y: 0,
                  scale: isDragged ? 1.05 : 1,
                  zIndex: isDragged ? 50 : 1,
                }}
                exit={{ opacity: 0, y: -20 }}
                drag={!isTouch && dragState.isDragging && isDragged}
                dragConstraints={{ left: 0, right: 0 }}
                onPan={handlePan}
                onPanEnd={handlePanEnd}
                className={`
                  relative bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 
                  ${isDragged ? 'shadow-lg ring-2 ring-orange-500 ring-opacity-50' : 'shadow-sm'}
                  ${isTouch ? 'select-none' : ''}
                  transition-all duration-200
                `}
                style={{
                  x: isDragged ? dragState.dragOffset.x : 0,
                  y: isDragged ? dragState.dragOffset.y : 0,
                }}
                onTouchStart={(e) => handleTouchStart(e, item, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => handleMouseDown(e, item, index)}
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Drag Handle */}
                  <div 
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-md cursor-grab active:cursor-grabbing
                      ${isTouch ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
                      transition-colors
                    `}
                  >
                    {isDragged ? (
                      <Move className="h-4 w-4 text-orange-500" />
                    ) : (
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    )}
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {song.title}
                        </h4>
                        {song.artist && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {song.artist}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {song.key && (
                          <Badge variant="outline" className="text-xs">
                            {item.keyOverride || song.key}
                          </Badge>
                        )}
                        {song.bpm && (
                          <Badge variant="outline" className="text-xs">
                            {song.bpm} BPM
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-4 text-center font-medium">
                          {index + 1}
                        </span>
                      </span>
                      
                      {song.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(song.duration_seconds / 60)}:
                          {(song.duration_seconds % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                      
                      {item.notes && (
                        <span className="truncate max-w-32">
                          {item.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isDragged && isTouch && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            triggerHapticFeedback('light');
                            handleTouchEnd();
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            triggerHapticFeedback('medium');
                            if (dragState.dropIndex !== null && dragState.draggedIndex !== null) {
                              onReorder(dragState.draggedIndex, dragState.dropIndex);
                            }
                            handleTouchEnd();
                          }}
                          className="h-8 w-8 p-0 bg-orange-500 text-white border-orange-500"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {!isDragged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          triggerHapticFeedback('medium');
                          onRemove(item.id);
                        }}
                        className={`h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ${
                          isTouch ? 'min-h-[44px] min-w-[44px]' : ''
                        }`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Long Press Indicator for Touch */}
                {isTouch && longPressTimer && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5 }}
                    className="absolute bottom-0 left-0 h-1 bg-orange-500 rounded-b-lg"
                  />
                )}
              </motion.div>
            </React.Fragment>
          );
        })}
      </AnimatePresence>

      {/* Instructions for touch devices */}
      {isTouch && items.length > 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Long press and drag to reorder songs
          </p>
        </div>
      )}
    </div>
  );
}

export default TouchDragDrop;