/**
 * Accessible Song Card Component
 * 
 * Wraps the existing SongCard components with comprehensive accessibility features:
 * - Proper ARIA attributes and roles
 * - Keyboard navigation support
 * - Screen reader announcements
 * - Focus management
 * - High contrast mode support
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, MoreHorizontal, Music } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { 
  getSongCardAriaAttributes,
  useScreenReaderAnnouncements,
  useHighContrastMode,
  useReducedMotion,
  getKeyboardShortcutDescription
} from '../../utils/accessibility';

import type { Song } from '@/types/song-library';
import type { AriaAttributes } from '../../utils/accessibility';

interface AccessibleSongCardProps {
  song: Song;
  isSelected: boolean;
  isFocused: boolean;
  position?: { row: number; col: number; total: number };
  onSelect: (song: Song) => void;
  onPlay: (song: Song) => void;
  onFavorite: (song: Song) => void;
  onMoreOptions: (song: Song) => void;
  onFocus: (song: Song) => void;
  onKeyDown: (event: React.KeyboardEvent, song: Song) => void;
  variant?: 'standard' | 'spotlight' | 'tilted';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AccessibleSongCard({
  song,
  isSelected,
  isFocused,
  position,
  onSelect,
  onPlay,
  onFavorite,
  onMoreOptions,
  onFocus,
  onKeyDown,
  variant = 'standard',
  size = 'md',
  className = ''
}: AccessibleSongCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { announce } = useScreenReaderAnnouncements();
  const isHighContrast = useHighContrastMode();
  const prefersReducedMotion = useReducedMotion();
  
  const [isHovered, setIsHovered] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  // Generate ARIA attributes
  const ariaAttributes = getSongCardAriaAttributes(song, isSelected, position);

  // Focus management
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.focus();
    }
  }, [isFocused]);

  // Handle card selection
  const handleSelect = useCallback(() => {
    onSelect(song);
    setLastAction('selected');
    
    // Announce selection change
    const message = isSelected 
      ? `Deselected ${song.title}`
      : `Selected ${song.title}`;
    announce(message, { priority: 'polite' });
  }, [song, isSelected, onSelect, announce]);

  // Handle play action
  const handlePlay = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    onPlay(song);
    setLastAction('played');
    
    // Announce play action
    announce(`Playing ${song.title}`, { priority: 'assertive' });
  }, [song, onPlay, announce]);

  // Handle favorite action
  const handleFavorite = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    onFavorite(song);
    setLastAction('favorited');
    
    // Announce favorite action (assuming we track favorite state)
    announce(`Added ${song.title} to favorites`, { priority: 'polite' });
  }, [song, onFavorite, announce]);

  // Handle more options
  const handleMoreOptions = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    onMoreOptions(song);
    setLastAction('options');
    
    // Announce options menu
    announce(`Opened options menu for ${song.title}`, { priority: 'polite' });
  }, [song, onMoreOptions, announce]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, shiftKey, ctrlKey, metaKey } = event;

    // Let parent handle navigation keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)) {
      onKeyDown(event, song);
      return;
    }

    switch (key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleSelect();
        break;

      case 'p':
      case 'P':
        if (!ctrlKey && !metaKey) {
          event.preventDefault();
          handlePlay(event);
        }
        break;

      case 'f':
      case 'F':
        if (!ctrlKey && !metaKey) {
          event.preventDefault();
          handleFavorite(event);
        }
        break;

      case 'm':
      case 'M':
        if (!ctrlKey && !metaKey) {
          event.preventDefault();
          handleMoreOptions(event);
        }
        break;

      case '?':
        event.preventDefault();
        // Announce keyboard shortcuts
        const shortcuts = [
          'Enter or Space: Select song',
          'P: Play song',
          'F: Add to favorites',
          'M: More options',
          'Arrow keys: Navigate'
        ];
        announce(`Keyboard shortcuts: ${shortcuts.join(', ')}`, { priority: 'polite' });
        break;

      default:
        // Pass through to parent for other keys
        onKeyDown(event, song);
        break;
    }
  }, [song, onKeyDown, handleSelect, handlePlay, handleFavorite, handleMoreOptions, announce]);

  // Handle focus
  const handleFocus = useCallback(() => {
    onFocus(song);
    
    // Announce focus change with song details
    const details = [
      song.title,
      song.artist && `by ${song.artist}`,
      song.key && `in key of ${song.key}`,
      song.bpm && `${song.bpm} BPM`,
      position && `${position.row + 1} of ${Math.ceil(position.total / 4)} rows`
    ].filter(Boolean).join(', ');
    
    announce(details, { priority: 'polite', delay: 100 });
  }, [song, position, onFocus, announce]);

  // Handle mouse enter for hover effects
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Size classes
  const sizeClasses = {
    sm: 'w-48 h-64',
    md: 'w-56 h-72',
    lg: 'w-64 h-80'
  };

  // High contrast styles
  const highContrastStyles = isHighContrast ? {
    border: '2px solid ButtonText',
    backgroundColor: 'ButtonFace',
    color: 'ButtonText'
  } : {};

  // Focus styles
  const focusStyles = isFocused ? {
    outline: '3px solid #f97316',
    outlineOffset: '2px',
    zIndex: 10
  } : {};

  // Animation variants (respect reduced motion)
  const animationVariants = prefersReducedMotion ? {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    whileHover: { opacity: 1 }
  } : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    whileHover: { y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }
  };

  return (
    <motion.div
      ref={cardRef}
      className={`
        ${sizeClasses[size]}
        overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-800 shadow-sm cursor-pointer
        transition-all duration-200 ease-out
        ${isFocused ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
        ${isSelected ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
        ${className}
      `}
      style={{
        ...highContrastStyles,
        ...focusStyles
      }}
      variants={animationVariants}
      initial="initial"
      animate="animate"
      whileHover="whileHover"
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...ariaAttributes}
    >
      {/* Cover Art Section */}
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-700">
        {song.cover_art_url ? (
          <img
            src={song.cover_art_url}
            alt={`Cover art for ${song.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-500"
            aria-label={`Generated cover art for ${song.title}`}
          >
            <Music className="h-12 w-12 text-white/80" aria-hidden="true" />
          </div>
        )}

        {/* Overlay Controls */}
        {(isHovered || isFocused) && (
          <motion.div
            className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
          >
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/20"
              onClick={handlePlay}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePlay(e);
                }
              }}
              aria-label={`Play ${song.title}`}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/20"
              onClick={handleFavorite}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleFavorite(e);
                }
              }}
              aria-label={`Add ${song.title} to favorites`}
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
            </Button>
          </motion.div>
        )}

        {/* Trending Badge */}
        {song.is_trending && (
          <div className="absolute top-2 right-2">
            <Badge 
              className="bg-orange-500 text-white text-xs"
              aria-label="Trending song"
            >
              Trending
            </Badge>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <div 
            className="absolute top-2 left-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* Song Information */}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 text-sm">
            {song.title}
          </h3>
          
          {song.artist && (
            <p className="text-slate-500 dark:text-slate-400 line-clamp-1 text-xs">
              {song.artist}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {song.key && (
              <Badge 
                variant="outline" 
                className="text-xs font-mono"
                aria-label={`Key of ${song.key}`}
              >
                {song.key}
              </Badge>
            )}
            {song.bpm && (
              <Badge 
                variant="outline" 
                className="text-xs"
                aria-label={`${song.bpm} beats per minute`}
              >
                {song.bpm}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {song.usage_count > 0 && (
              <span 
                className="text-xs text-slate-500 dark:text-slate-400"
                aria-label={`Used ${song.usage_count} times`}
              >
                {song.usage_count}
              </span>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={handleMoreOptions}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleMoreOptions(e);
                }
              }}
              aria-label={`More options for ${song.title}`}
            >
              <MoreHorizontal className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Screen reader only content */}
      <div className="sr-only">
        <p>
          Song: {song.title}
          {song.artist && `, Artist: ${song.artist}`}
          {song.key && `, Key: ${song.key}`}
          {song.bpm && `, BPM: ${song.bpm}`}
          {song.usage_count > 0 && `, Used ${song.usage_count} times`}
          {isSelected && ', Selected'}
          {song.is_trending && ', Trending'}
        </p>
        <p>
          Press Enter or Space to select, P to play, F to favorite, M for more options, ? for help
        </p>
      </div>
    </motion.div>
  );
}

export default AccessibleSongCard;