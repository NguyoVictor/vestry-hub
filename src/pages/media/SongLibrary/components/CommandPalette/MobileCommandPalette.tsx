/**
 * Mobile Command Palette Component for Song Library UI Revamp
 * 
 * Mobile-optimized search interface with:
 * - Fullscreen modal for better touch experience
 * - Touch-friendly search input and results
 * - Swipe gestures for navigation
 * - Haptic feedback for interactions
 * - Adaptive keyboard handling
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'cmdk';
import Fuse from 'fuse.js';
import { 
  Search, 
  Music, 
  Clock, 
  Hash, 
  TrendingUp, 
  History,
  Filter,
  X,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useTouchGestures, triggerHapticFeedback } from '../../utils/mobileUtils';
import type { Song, SearchFilters } from '@/types/song-library';

interface MobileCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  onSongSelect: (song: Song) => void;
}

// Fuse.js configuration optimized for mobile
const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'artist', weight: 0.3 },
    { name: 'tags', weight: 0.2 },
  ],
  threshold: 0.4, // More lenient for touch typing
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 1, // Allow single character searches on mobile
};

export function MobileCommandPalette({ 
  isOpen, 
  onClose, 
  songs, 
  onSongSelect 
}: MobileCommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => new Fuse(songs, fuseOptions), [songs]);

  // Touch gesture handlers
  const handleSwipeDown = useCallback(() => {
    triggerHapticFeedback('light');
    onClose();
  }, [onClose]);

  const handleSwipeLeft = useCallback(() => {
    if (!showFilters) {
      triggerHapticFeedback('medium');
      setShowFilters(true);
    }
  }, [showFilters]);

  const handleSwipeRight = useCallback(() => {
    if (showFilters) {
      triggerHapticFeedback('medium');
      setShowFilters(false);
    }
  }, [showFilters]);

  const touchGestures = useTouchGestures(
    handleSwipeLeft,
    handleSwipeRight,
    undefined, // No swipe up action
    handleSwipeDown,
    30, // Lower threshold for mobile
    0.2 // Lower velocity threshold
  );

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('song-library-recent-searches-mobile');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 8); // More recent searches on mobile
    setRecentSearches(updated);
    localStorage.setItem('song-library-recent-searches-mobile', JSON.stringify(updated));
  }, [recentSearches]);

  // Perform fuzzy search
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];

    const results = fuse.search(search);
    return results.slice(0, 20).map(result => ({ // Limit results on mobile
      song: result.item,
      relevanceScore: 1 - (result.score || 0),
      matchedFields: result.matches?.map(match => match.key) || [],
      highlightedText: result.matches?.[0]?.value || result.item.title,
    }));
  }, [search, fuse]);

  // Get popular/trending songs for empty state
  const popularSongs = useMemo(() => {
    return songs
      .filter(song => song.usage_count > 0 || song.is_trending)
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 8); // Fewer items on mobile
  }, [songs]);

  // Handle song selection
  const handleSongSelect = useCallback((song: Song) => {
    triggerHapticFeedback('medium');
    saveRecentSearch(search);
    onSongSelect(song);
    setSearch('');
    onClose();
  }, [search, saveRecentSearch, onSongSelect, onClose]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((query: string) => {
    triggerHapticFeedback('light');
    setSearch(query);
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    triggerHapticFeedback('medium');
    setRecentSearches([]);
    localStorage.removeItem('song-library-recent-searches-mobile');
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setShowFilters(false);
    }
  }, [isOpen]);

  // Mobile-optimized animations
  const modalVariants = {
    hidden: { 
      opacity: 0, 
      y: '100%',
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0, 
      y: '100%',
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  const contentVariants = {
    search: {
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    filters: {
      x: "-100%",
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent 
            className="fixed inset-0 z-50 bg-white dark:bg-slate-900 p-0 m-0 max-w-none h-full rounded-none border-none"
            {...touchGestures}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-10 w-10 p-0 shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search songs, artists, or lyrics..."
                    className="pl-10 pr-4 h-12 text-base border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500/20"
                    autoFocus
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-10 w-10 p-0 shrink-0 ${showFilters ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : ''}`}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden relative">
                <motion.div
                  variants={contentVariants}
                  animate={showFilters ? "filters" : "search"}
                  className="flex h-full"
                >
                  {/* Search Results */}
                  <div className="w-full h-full flex-shrink-0">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-4">
                        {search.trim() ? (
                          // Search Results
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Search Results
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                {searchResults.length}
                              </Badge>
                            </div>
                            
                            {searchResults.length > 0 ? (
                              <div className="space-y-2">
                                {searchResults.map((result, index) => (
                                  <motion.button
                                    key={result.song.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => handleSongSelect(result.song)}
                                    className="w-full p-4 text-left bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors min-h-[60px] flex items-center gap-3"
                                  >
                                    <div className="h-10 w-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center shrink-0">
                                      <Music className="h-5 w-5 text-white" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                        {result.song.title}
                                      </p>
                                      {result.song.artist && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                          {result.song.artist}
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center gap-2 mt-1">
                                        {result.song.key && (
                                          <Badge variant="outline" className="text-xs">
                                            {result.song.key}
                                          </Badge>
                                        )}
                                        {result.song.bpm && (
                                          <Badge variant="outline" className="text-xs">
                                            {result.song.bpm} BPM
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500 dark:text-slate-400">
                                  No songs found for "{search}"
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Empty State with Recent Searches and Popular Songs
                          <div className="space-y-6">
                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <History className="h-4 w-4" />
                                    Recent Searches
                                  </h3>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearRecentSearches}
                                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                                  >
                                    Clear
                                  </Button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  {recentSearches.map((query, index) => (
                                    <motion.button
                                      key={query}
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: index * 0.05 }}
                                      onClick={() => handleRecentSearchSelect(query)}
                                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                      {query}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Popular Songs */}
                            {popularSongs.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4" />
                                  Popular Songs
                                </h3>
                                
                                <div className="space-y-2">
                                  {popularSongs.map((song, index) => (
                                    <motion.button
                                      key={song.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      onClick={() => handleSongSelect(song)}
                                      className="w-full p-3 text-left bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex items-center gap-3"
                                    >
                                      <div className="h-8 w-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-md flex items-center justify-center shrink-0">
                                        <Music className="h-4 w-4 text-white" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
                                          {song.title}
                                        </p>
                                        {song.artist && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {song.artist}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {song.is_trending && (
                                        <Badge variant="secondary" className="text-xs">
                                          Trending
                                        </Badge>
                                      )}
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Filters Panel */}
                  <div className="w-full h-full flex-shrink-0 bg-slate-50 dark:bg-slate-800">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                          Filters
                        </h3>
                        
                        {/* Filter content would go here */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                              Key
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(key => (
                                <Button
                                  key={key}
                                  variant="outline"
                                  size="sm"
                                  className="h-10"
                                >
                                  {key}
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                              BPM Range
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="outline" size="sm" className="h-10">
                                Slow (60-90)
                              </Button>
                              <Button variant="outline" size="sm" className="h-10">
                                Fast (120+)
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </motion.div>
              </div>

              {/* Swipe Indicator */}
              <div className="p-2 text-center">
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto" />
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

export default MobileCommandPalette;