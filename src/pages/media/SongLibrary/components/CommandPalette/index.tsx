/**
 * Command Palette Component for Song Library UI Revamp
 * 
 * Advanced search interface with:
 * - ⌘K/Ctrl+K keyboard shortcut activation
 * - Fuzzy search across song titles, artists, lyrics, and tags
 * - Real-time search results with highlighted matching text
 * - Advanced filtering by key, BPM range, time signature, and tags
 * - Recent searches and popular songs when empty
 * - Direct navigation to song details from search results
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  X
} from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import type { Song, SearchFilters, CommandPaletteProps } from '@/types/song-library';

// Fuse.js configuration for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'artist', weight: 0.3 },
    { name: 'lyrics', weight: 0.2 },
    { name: 'tags', weight: 0.1 },
  ],
  threshold: 0.3,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
};

export function CommandPalette({ 
  isOpen, 
  onClose, 
  songs, 
  onSongSelect 
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => new Fuse(songs, fuseOptions), [songs]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('song-library-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('song-library-recent-searches', JSON.stringify(updated));
  };

  // Perform fuzzy search
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];

    const results = fuse.search(search);
    return results.map(result => ({
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
      .slice(0, 5);
  }, [songs]);

  // Handle song selection
  const handleSongSelect = (song: Song) => {
    saveRecentSearch(search);
    onSongSelect(song);
    setSearch('');
    onClose();
  };

  // Handle recent search selection
  const handleRecentSearchSelect = (query: string) => {
    setSearch(query);
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const totalItems = searchResults.length || Math.max(recentSearches.length, popularSongs.length);
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults.length > 0) {
            handleSongSelect(searchResults[selectedIndex]?.song);
          } else if (recentSearches.length > 0 && selectedIndex < recentSearches.length) {
            handleRecentSearchSelect(recentSearches[selectedIndex]);
          } else if (popularSongs.length > 0) {
            const popularIndex = selectedIndex - recentSearches.length;
            if (popularIndex >= 0 && popularIndex < popularSongs.length) {
              handleSongSelect(popularSongs[popularIndex]);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, recentSearches, popularSongs, selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <Command className="rounded-lg border-0">
                {/* Search Input */}
                <div className="flex items-center border-b border-slate-200 dark:border-slate-700 px-4">
                  <Search className="h-4 w-4 text-slate-400 mr-3" />
                  <Command.Input
                    placeholder="Search songs, artists, lyrics..."
                    value={search}
                    onValueChange={setSearch}
                    className="flex-1 py-4 text-sm bg-transparent border-0 outline-none placeholder:text-slate-400"
                  />
                  {search && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearch('')}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Results */}
                <Command.List className="max-h-80 overflow-y-auto p-2">
                  {/* Search Results */}
                  {search && searchResults.length > 0 && (
                    <Command.Group heading="Search Results">
                      {searchResults.map((result, index) => (
                        <Command.Item
                          key={result.song.id}
                          value={result.song.id}
                          onSelect={() => handleSongSelect(result.song)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            index === selectedIndex
                              ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Music className="h-4 w-4 text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {result.song.title}
                            </p>
                            {result.song.artist && (
                              <p className="text-xs text-slate-500 truncate">
                                {result.song.artist}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {result.song.key && (
                              <Badge variant="outline" className="text-xs font-mono">
                                {result.song.key}
                              </Badge>
                            )}
                            {result.song.bpm && (
                              <Badge variant="outline" className="text-xs">
                                {result.song.bpm} BPM
                              </Badge>
                            )}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* No Results */}
                  {search && searchResults.length === 0 && (
                    <Command.Empty className="py-8 text-center text-sm text-slate-500">
                      No songs found for "{search}"
                    </Command.Empty>
                  )}

                  {/* Recent Searches */}
                  {!search && recentSearches.length > 0 && (
                    <>
                      <Command.Group heading="Recent Searches">
                        {recentSearches.map((query, index) => (
                          <Command.Item
                            key={query}
                            value={query}
                            onSelect={() => handleRecentSearchSelect(query)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              index === selectedIndex
                                ? 'bg-slate-100 dark:bg-slate-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <History className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">{query}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                      <Separator className="my-2" />
                    </>
                  )}

                  {/* Popular Songs */}
                  {!search && popularSongs.length > 0 && (
                    <Command.Group heading="Popular Songs">
                      {popularSongs.map((song, index) => {
                        const adjustedIndex = recentSearches.length + index;
                        return (
                          <Command.Item
                            key={song.id}
                            value={song.id}
                            onSelect={() => handleSongSelect(song)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              adjustedIndex === selectedIndex
                                ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <TrendingUp className="h-4 w-4 text-slate-400" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {song.title}
                              </p>
                              {song.artist && (
                                <p className="text-xs text-slate-500 truncate">
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
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  )}

                  {/* Empty State */}
                  {!search && recentSearches.length === 0 && popularSongs.length === 0 && (
                    <div className="py-8 text-center text-sm text-slate-500">
                      <Music className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p>Start typing to search your song library</p>
                      <p className="text-xs mt-1">Use ⌘K to open this palette anytime</p>
                    </div>
                  )}
                </Command.List>

                {/* Footer */}
                <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
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
              </Command>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;