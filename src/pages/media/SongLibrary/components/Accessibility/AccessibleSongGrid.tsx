/**
 * Accessible Song Grid Component
 * 
 * Wraps the existing SongGrid with comprehensive accessibility features:
 * - Grid keyboard navigation (arrow keys, home/end, page up/down)
 * - Proper ARIA grid attributes and roles
 * - Screen reader announcements for navigation and selection
 * - Focus management and visual focus indicators
 * - High contrast mode support
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, Music } from 'lucide-react';

import { 
  useKeyboardNavigation,
  useFocusManagement 
} from '../../hooks/useKeyboardNavigation';

import { 
  useScreenReaderAnnouncements,
  useHighContrastMode,
  useReducedMotion,
  getSongCardAriaAttributes,
  getLoadingAnnouncement
} from '../../utils/accessibility';

import { AccessibleSongCard } from './AccessibleSongCard';
import { StaggerContainer, StaggerItem } from '../AnimationEngine';

import type { Song } from '@/types/song-library';

interface AccessibleSongGridProps {
  songs: Song[];
  loading: boolean;
  selectedSongs: string[];
  onSongSelect: (song: Song) => void;
  onSongPlay: (song: Song) => void;
  onSongFavorite: (song: Song) => void;
  onSongMoreOptions: (song: Song) => void;
  onAddSong?: () => void;
  searchQuery?: string;
  filters?: any;
  variant?: 'standard' | 'spotlight' | 'tilted' | 'mixed';
  cardSize?: 'sm' | 'md' | 'lg';
  isMobile?: boolean;
  className?: string;
}

export function AccessibleSongGrid({
  songs,
  loading,
  selectedSongs,
  onSongSelect,
  onSongPlay,
  onSongFavorite,
  onSongMoreOptions,
  onAddSong,
  searchQuery = '',
  filters = {},
  variant = 'mixed',
  cardSize = 'md',
  isMobile = false,
  className = ''
}: AccessibleSongGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const { announce } = useScreenReaderAnnouncements();
  const isHighContrast = useHighContrastMode();
  const prefersReducedMotion = useReducedMotion();

  const [focusedSongId, setFocusedSongId] = useState<string | null>(null);
  const [lastAnnouncedCount, setLastAnnouncedCount] = useState(0);

  // Calculate grid dimensions
  const columnsPerRow = isMobile ? 1 : 4; // Adjust based on screen size
  const totalItems = songs.length;

  // Keyboard navigation
  const {
    focusIndex,
    isActive: isKeyboardActive,
    setFocusIndex,
    handleKeyDown: handleNavigationKeyDown
  } = useKeyboardNavigation({
    itemCount: totalItems,
    orientation: 'grid',
    columns: columnsPerRow,
    wrap: true,
    enabled: !loading && totalItems > 0,
    onFocusChange: (index) => {
      if (index >= 0 && index < songs.length) {
        const song = songs[index];
        setFocusedSongId(song.id);
        
        // Announce navigation
        const position = {
          row: Math.floor(index / columnsPerRow),
          col: index % columnsPerRow,
          total: totalItems
        };
        
        const announcement = [
          song.title,
          song.artist && `by ${song.artist}`,
          `${index + 1} of ${totalItems}`,
          position.row > 0 && `row ${position.row + 1}`
        ].filter(Boolean).join(', ');
        
        announce(announcement, { priority: 'polite', delay: 100 });
      }
    },
    onActivate: (index) => {
      if (index >= 0 && index < songs.length) {
        onSongSelect(songs[index]);
      }
    },
    customKeyHandlers: {
      'p': (index) => {
        if (index >= 0 && index < songs.length) {
          onSongPlay(songs[index]);
        }
      },
      'f': (index) => {
        if (index >= 0 && index < songs.length) {
          onSongFavorite(songs[index]);
        }
      },
      'm': (index) => {
        if (index >= 0 && index < songs.length) {
          onSongMoreOptions(songs[index]);
        }
      }
    }
  });

  // Focus management
  const { focusFirst } = useFocusManagement({
    containerRef: gridRef,
    autoFocus: false,
    restoreFocus: false,
    trapFocus: false
  });

  // Update focused song when focus index changes
  useEffect(() => {
    if (focusIndex >= 0 && focusIndex < songs.length) {
      setFocusedSongId(songs[focusIndex].id);
    } else {
      setFocusedSongId(null);
    }
  }, [focusIndex, songs]);

  // Announce loading state changes
  useEffect(() => {
    if (loading) {
      announce(getLoadingAnnouncement(true, 'songs'), { priority: 'polite' });
    } else if (songs.length !== lastAnnouncedCount) {
      announce(getLoadingAnnouncement(false, 'songs', songs.length), { priority: 'polite' });
      setLastAnnouncedCount(songs.length);
    }
  }, [loading, songs.length, lastAnnouncedCount, announce]);

  // Handle song focus
  const handleSongFocus = useCallback((song: Song) => {
    const index = songs.findIndex(s => s.id === song.id);
    if (index >= 0) {
      setFocusIndex(index);
    }
  }, [songs, setFocusIndex]);

  // Handle keyboard events from song cards
  const handleSongKeyDown = useCallback((event: React.KeyboardEvent, song: Song) => {
    // Find the song index and update navigation state
    const index = songs.findIndex(s => s.id === song.id);
    if (index >= 0 && index !== focusIndex) {
      setFocusIndex(index);
    }
    
    // Handle navigation
    handleNavigationKeyDown(event);
  }, [songs, focusIndex, setFocusIndex, handleNavigationKeyDown]);

  // Grid container keyboard handler
  const handleGridKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Only handle if no specific song is focused
    if (!focusedSongId) {
      handleNavigationKeyDown(event);
    }
  }, [focusedSongId, handleNavigationKeyDown]);

  // Calculate grid classes
  const gridClasses = useMemo(() => {
    const baseClasses = 'grid gap-6';
    
    if (isMobile) {
      return `${baseClasses} grid-cols-1`;
    }
    
    return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`;
  }, [isMobile]);

  // High contrast styles
  const highContrastStyles = isHighContrast ? {
    outline: '2px solid ButtonText',
    backgroundColor: 'ButtonFace'
  } : {};

  if (loading) {
    return (
      <div 
        ref={gridRef}
        className={`w-full ${className}`}
        role="grid"
        aria-label="Loading songs"
        aria-busy="true"
      >
        <div className={gridClasses}>
          {Array.from({ length: isMobile ? 4 : 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl aspect-[3/4]"
              role="gridcell"
              aria-label={`Loading song ${i + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div 
        ref={gridRef}
        className={`w-full ${className}`}
        role="grid"
        aria-label="No songs available"
      >
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <Grid3X3 className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-6" aria-hidden="true" />
          
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            No songs found
          </h3>
          
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            {searchQuery 
              ? `No songs match "${searchQuery}". Try adjusting your search or filters.`
              : "Add your first song to get started with your music library."
            }
          </p>
          
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            onClick={onAddSong}
            aria-label="Add your first song to the library"
          >
            <Music className="h-4 w-4" aria-hidden="true" />
            Add Your First Song
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      ref={gridRef}
      className={`w-full ${className}`}
      role="grid"
      aria-label={`Song library with ${songs.length} songs`}
      aria-rowcount={Math.ceil(songs.length / columnsPerRow)}
      aria-colcount={columnsPerRow}
      onKeyDown={handleGridKeyDown}
      tabIndex={isKeyboardActive && !focusedSongId ? 0 : -1}
      style={highContrastStyles}
    >
      {/* Instructions for screen readers */}
      <div className="sr-only" id="grid-instructions">
        Use arrow keys to navigate between songs. Press Enter or Space to select a song.
        Press P to play, F to favorite, M for more options, or ? for help.
        {songs.length} songs available in a {Math.ceil(songs.length / columnsPerRow)} by {columnsPerRow} grid.
      </div>

      <StaggerContainer 
        variant={prefersReducedMotion ? "none" : (isMobile ? "fast" : "normal")}
        className={gridClasses}
        role="presentation"
      >
        {songs.map((song, index) => {
          const position = {
            row: Math.floor(index / columnsPerRow),
            col: index % columnsPerRow,
            total: songs.length
          };

          const isFocused = song.id === focusedSongId;
          const isSelected = selectedSongs.includes(song.id);

          return (
            <StaggerItem 
              key={song.id} 
              variant={prefersReducedMotion ? "none" : "stagger"}
              delay={index * 0.05}
              role="gridcell"
              aria-rowindex={position.row + 1}
              aria-colindex={position.col + 1}
            >
              <AccessibleSongCard
                song={song}
                isSelected={isSelected}
                isFocused={isFocused}
                position={position}
                onSelect={onSongSelect}
                onPlay={onSongPlay}
                onFavorite={onSongFavorite}
                onMoreOptions={onSongMoreOptions}
                onFocus={handleSongFocus}
                onKeyDown={handleSongKeyDown}
                variant={variant}
                size={cardSize}
              />
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Live region for grid announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="false" 
        className="sr-only"
        id="grid-announcements"
      />
    </div>
  );
}

export default AccessibleSongGrid;