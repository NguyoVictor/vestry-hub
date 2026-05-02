/**
 * Accessible Command Palette Component
 * 
 * Wraps the existing CommandPalette with comprehensive accessibility features:
 * - Proper ARIA attributes for combobox pattern
 * - Keyboard navigation with arrow keys
 * - Screen reader announcements for search results
 * - Focus management and restoration
 * - High contrast mode support
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'cmdk';
import { 
  Search, 
  Music, 
  History, 
  TrendingUp, 
  X,
  ArrowUp,
  ArrowDown,
  Enter as EnterIcon
} from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { 
  getCommandPaletteAriaAttributes,
  getSearchResultAriaAttributes,
  useScreenReaderAnnouncements,
  useHighContrastMode,
  useReducedMotion,
  getSearchResultAnnouncement,
  getKeyboardShortcutDescription
} from '../../utils/accessibility';

import { useKeyboardNavigation, useFocusManagement } from '../../hooks/useKeyboardNavigation';

import type { Song, SearchFilters, CommandPaletteProps } from '@/types/song-library';

interface AccessibleCommandPaletteProps extends CommandPaletteProps {
  /** Additional accessibility options */
  accessibilityOptions?: {
    announceResults?: boolean;
    announceNavigation?: boolean;
    enableTypeAhead?: boolean;
  };
}

export function AccessibleCommandPalette({ 
  isOpen, 
  onClose, 
  songs, 
  onSongSelect,
  accessibilityOptions = {}
}: AccessibleCommandPaletteProps) {
  const {
    announceResults = true,
    announceNavigation = true,
    enableTypeAhead = true
  } = accessibilityOptions;

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const { announce } = useScreenReaderAnnouncements();
  const isHighContrast = useHighContrastMode();
  const prefersReducedMotion = useReducedMotion();

  // Calculate total items for navigation
  const totalItems = search 
    ? searchResults.length 
    : recentSearches.length + popularSongs.length;

  // Handle song selection
  const handleSongSelect = useCallback((song: Song) => {
    // Save search to recent searches
    if (search.trim()) {
      const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('song-library-recent-searches', JSON.stringify(updated));
    }

    // Announce selection
    announce(`Selected ${song.title}`, { priority: 'assertive' });

    // Call parent handler
    onSongSelect(song);
    
    // Reset and close
    setSearch('');
    onClose();
  }, [search, recentSearches, announce, onSongSelect, onClose]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((query: string) => {
    setSearch(query);
    announce(`Searching for ${query}`, { priority: 'polite' });
  }, [announce]);

  // Keyboard navigation for results
  const handleFocusChange = useCallback((index: number) => {
    if (announceNavigation) {
      // Announce the focused item
      if (search && searchResults[index]) {
        const song = searchResults[index];
        announce(`${song.title}${song.artist ? ` by ${song.artist}` : ''}`, { 
          priority: 'polite',
          delay: 100 
        });
      } else if (!search) {
        const recentIndex = index;
        const popularIndex = index - recentSearches.length;
        
        if (recentIndex < recentSearches.length) {
          announce(`Recent search: ${recentSearches[recentIndex]}`, { 
            priority: 'polite',
            delay: 100 
          });
        } else if (popularIndex >= 0 && popularIndex < popularSongs.length) {
          const song = popularSongs[popularIndex];
          announce(`Popular song: ${song.title}${song.artist ? ` by ${song.artist}` : ''}`, { 
            priority: 'polite',
            delay: 100 
          });
        }
      }
    }
  }, [announceNavigation, search, searchResults, recentSearches, popularSongs, announce]);

  const handleActivate = useCallback((index: number) => {
    if (search && searchResults[index]) {
      handleSongSelect(searchResults[index]);
    } else if (!search) {
      const recentIndex = index;
      const popularIndex = index - recentSearches.length;
      
      if (recentIndex < recentSearches.length) {
        handleRecentSearchSelect(recentSearches[recentIndex]);
      } else if (popularIndex >= 0 && popularIndex < popularSongs.length) {
        handleSongSelect(popularSongs[popularIndex]);
      }
    }
  }, [search, searchResults, recentSearches, popularSongs, handleSongSelect, handleRecentSearchSelect]);

  const {
    focusIndex,
    isActive: isKeyboardActive,
    setFocusIndex,
    handleKeyDown: handleNavigationKeyDown
  } = useKeyboardNavigation({
    itemCount: totalItems,
    orientation: 'vertical',
    wrap: true,
    enabled: isOpen,
    onFocusChange: handleFocusChange,
    onActivate: handleActivate
  });

  // Focus management
  const { focusFirst } = useFocusManagement({
    containerRef: dialogRef,
    autoFocus: true,
    restoreFocus: true,
    trapFocus: true
  });

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      // Load recent searches from localStorage
      const saved = localStorage.getItem('song-library-recent-searches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to parse recent searches:', error);
        }
      }

      // Load popular songs
      const popular = songs
        .filter(song => song.usage_count > 0 || song.is_trending)
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 5);
      setPopularSongs(popular);

      // Focus input after dialog opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, songs]);

  // Perform search when query changes
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setFocusIndex(0);
      return;
    }

    // Simple search implementation (replace with Fuse.js in production)
    const results = songs.filter(song => 
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      (song.artist && song.artist.toLowerCase().includes(search.toLowerCase())) ||
      (song.lyrics && song.lyrics.toLowerCase().includes(search.toLowerCase())) ||
      song.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    ).slice(0, 10);

    setSearchResults(results);
    setFocusIndex(0);

    // Announce search results
    if (announceResults) {
      const announcement = getSearchResultAnnouncement(search, results.length);
      announce(announcement, { priority: 'polite', delay: 300 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, songs, announceResults, announce]);

  // Handle input changes
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key, ctrlKey, metaKey } = event;

    switch (key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        break;

      case 'ArrowUp':
      case 'ArrowDown':
        // Let navigation hook handle these
        handleNavigationKeyDown(event);
        break;

      case 'Enter':
        // Let navigation hook handle activation
        handleNavigationKeyDown(event);
        break;

      case 'Tab':
        // Allow normal tab navigation within dialog
        break;

      default:
        // Focus input for typing if not already focused
        if (key.length === 1 && document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
        break;
    }
  }, [onClose, handleNavigationKeyDown]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearch('');
    setFocusIndex(0);
    inputRef.current?.focus();
    announce('Search cleared', { priority: 'polite' });
  }, [setFocusIndex, announce]);

  // Generate ARIA attributes
  const comboboxAttributes = getCommandPaletteAriaAttributes(
    isOpen,
    focusIndex,
    totalItems
  );

  // High contrast styles
  const highContrastStyles = isHighContrast ? {
    border: '2px solid ButtonText',
    backgroundColor: 'ButtonFace',
    color: 'ButtonText'
  } : {};

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent 
            ref={dialogRef}
            className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            style={highContrastStyles}
            onKeyDown={handleKeyDown}
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -20 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15, ease: "easeOut" }}
            >
              {/* Header with Search Input */}
              <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-4">
                <Search className="h-4 w-4 text-slate-400 mr-3" aria-hidden="true" />
                
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search songs, artists, lyrics..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="flex-1 py-4 text-sm bg-transparent border-0 outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                  {...comboboxAttributes}
                  aria-describedby="search-instructions"
                />

                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Instructions for screen readers */}
              <div id="search-instructions" className="sr-only">
                Use arrow keys to navigate results, Enter to select, Escape to close.
                {totalItems > 0 && ` ${totalItems} results available.`}
              </div>

              {/* Results */}
              <div 
                ref={resultsRef}
                className="max-h-80 overflow-y-auto p-2"
                role="listbox"
                aria-label="Search results"
              >
                {/* Search Results */}
                {search && searchResults.length > 0 && (
                  <div role="group" aria-labelledby="search-results-heading">
                    <h3 id="search-results-heading" className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Search Results
                    </h3>
                    
                    {searchResults.map((song, index) => {
                      const isSelected = index === focusIndex;
                      const resultAttributes = getSearchResultAriaAttributes(index, isSelected, song);
                      
                      return (
                        <div
                          key={song.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          onClick={() => handleSongSelect(song)}
                          {...resultAttributes}
                        >
                          <Music className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {song.title}
                            </p>
                            {song.artist && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {song.artist}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {song.key && (
                              <Badge variant="outline" className="text-xs font-mono">
                                {song.key}
                              </Badge>
                            )}
                            {song.bpm && (
                              <Badge variant="outline" className="text-xs">
                                {song.bpm} BPM
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No Results */}
                {search && searchResults.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    <Music className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                    <p>No songs found for "{search}"</p>
                    <p className="text-xs mt-1">Try adjusting your search terms</p>
                  </div>
                )}

                {/* Recent Searches */}
                {!search && recentSearches.length > 0 && (
                  <div role="group" aria-labelledby="recent-searches-heading">
                    <h3 id="recent-searches-heading" className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Recent Searches
                    </h3>
                    
                    {recentSearches.map((query, index) => {
                      const isSelected = index === focusIndex;
                      
                      return (
                        <div
                          key={query}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-slate-100 dark:bg-slate-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                          onClick={() => handleRecentSearchSelect(query)}
                          role="option"
                          aria-selected={isSelected}
                          aria-label={`Recent search: ${query}`}
                        >
                          <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          <span className="text-sm">{query}</span>
                        </div>
                      );
                    })}
                    
                    <Separator className="my-2" />
                  </div>
                )}

                {/* Popular Songs */}
                {!search && popularSongs.length > 0 && (
                  <div role="group" aria-labelledby="popular-songs-heading">
                    <h3 id="popular-songs-heading" className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Popular Songs
                    </h3>
                    
                    {popularSongs.map((song, index) => {
                      const adjustedIndex = recentSearches.length + index;
                      const isSelected = adjustedIndex === focusIndex;
                      
                      return (
                        <div
                          key={song.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          onClick={() => handleSongSelect(song)}
                          role="option"
                          aria-selected={isSelected}
                          aria-label={`Popular song: ${song.title}${song.artist ? ` by ${song.artist}` : ''}`}
                        >
                          <TrendingUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {song.title}
                            </p>
                            {song.artist && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {song.artist}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {song.usage_count > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {song.usage_count} uses
                              </Badge>
                            )}
                            {song.is_trending && (
                              <Badge className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                                Trending
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!search && recentSearches.length === 0 && popularSongs.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    <Music className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                    <p>Start typing to search your song library</p>
                    <p className="text-xs mt-1">Use ⌘K to open this palette anytime</p>
                  </div>
                )}
              </div>

              {/* Footer with Keyboard Shortcuts */}
              <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">↵</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">esc</kbd>
                      Close
                    </span>
                  </div>
                  <span>{songs.length} songs available</span>
                </div>
              </div>

              {/* Live region for announcements */}
              <div 
                aria-live="polite" 
                aria-atomic="true" 
                className="sr-only"
                id="search-announcements"
              />
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

export default AccessibleCommandPalette;