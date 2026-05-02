/**
 * Drag and Drop Provider for Setlist Builder
 * 
 * Provides @dnd-kit context and configuration for drag-and-drop functionality
 * in the setlist builder with visual feedback and collision detection.
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import type { Song, SetlistItem } from '@/types/song-library';
import { DragPreview } from './DragPreview';

interface DragDropProviderProps {
  children: React.ReactNode;
  setlistItems: SetlistItem[];
  onReorderItems: (fromIndex: number, toIndex: number) => void;
  onAddSongToSetlist: (song: Song, position?: number) => void;
  className?: string;
}

interface DragState {
  activeItem: SetlistItem | Song | null;
  dragType: 'song' | 'setlist_item' | null;
  dragSource: 'library' | 'setlist' | null;
}

export function DragDropProvider({
  children,
  setlistItems,
  onReorderItems,
  onAddSongToSetlist,
  className,
}: DragDropProviderProps) {
  const [dragState, setDragState] = useState<DragState>({
    activeItem: null,
    dragType: null,
    dragSource: null,
  });

  // Configure sensors for both mouse and keyboard interaction
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection for better drop zone targeting
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First, let's see if there are any collisions with the pointer
    const pointerIntersections = rectIntersection(args);
    
    if (pointerIntersections.length > 0) {
      return pointerIntersections;
    }

    // If no pointer intersections, fall back to center-based detection
    return closestCenter(args);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    // Determine if we're dragging a song from library or setlist item
    const setlistItem = setlistItems.find(item => item.id === activeId);
    
    if (setlistItem) {
      setDragState({
        activeItem: setlistItem,
        dragType: 'setlist_item',
        dragSource: 'setlist',
      });
    } else {
      // This would be a song from the library
      // The song data should be passed through the active data
      const songData = active.data.current as Song;
      if (songData) {
        setDragState({
          activeItem: songData,
          dragType: 'song',
          dragSource: 'library',
        });
      }
    }
  }, [setlistItems]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over events for visual feedback
    // This is where we could add visual indicators for valid drop zones
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDragState({ activeItem: null, dragType: null, dragSource: null });
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle reordering within setlist
    if (dragState.dragType === 'setlist_item' && dragState.dragSource === 'setlist') {
      const activeIndex = setlistItems.findIndex(item => item.id === activeId);
      const overIndex = setlistItems.findIndex(item => item.id === overId);
      
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        onReorderItems(activeIndex, overIndex);
      }
    }
    
    // Handle adding song from library to setlist
    else if (dragState.dragType === 'song' && dragState.dragSource === 'library') {
      const song = dragState.activeItem as Song;
      
      // Determine insertion position based on drop target
      let insertPosition: number | undefined;
      
      if (overId.startsWith('setlist-position-')) {
        // Dropped on a specific position indicator
        insertPosition = parseInt(overId.replace('setlist-position-', ''));
      } else {
        // Dropped on an existing item - insert after it
        const overIndex = setlistItems.findIndex(item => item.id === overId);
        if (overIndex !== -1) {
          insertPosition = overIndex + 1;
        }
      }
      
      onAddSongToSetlist(song, insertPosition);
    }

    // Reset drag state
    setDragState({ activeItem: null, dragType: null, dragSource: null });
  }, [dragState, setlistItems, onReorderItems, onAddSongToSetlist]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
    >
      <SortableContext 
        items={setlistItems.map(item => item.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className={className}>
          {children}
        </div>
      </SortableContext>
      
      {/* Drag Overlay for visual feedback */}
      <DragOverlay dropAnimation={null}>
        {dragState.activeItem && (
          <DragPreview
            item={dragState.activeItem}
            dragType={dragState.dragType!}
            isDragging={true}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default DragDropProvider;