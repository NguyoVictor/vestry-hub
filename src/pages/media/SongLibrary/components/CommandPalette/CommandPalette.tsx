/**
 * Command Palette Component for Song Library UI Revamp
 * 
 * Implements ⌘K/Ctrl+K keyboard shortcut activation with cmdk integration.
 * Provides advanced search, navigation, and quick actions for the song library.
 * 
 * Features:
 * - Keyboard shortcut activation (⌘K/Ctrl+K)
 * - Fuzzy search across song fields
 * - Quick navigation and actions
 * - Keyboard navigation and accessibility
 * - Real-time search results
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Music, 
  Play, 
  Plus, 
  Settings, 
  Filter,
  Clock,
  TrendingUp,
  Heart,
  Mic,
  Users,
  Calendar,
  FileText,
  Command as CommandIcon
} from 'lucide-react';
import { Command } from 'cmdk';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';

import { useSongSearch } from '../../hooks/useSongSearch';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { BlurText } from '../ReactBits';
import type { Song } from '@/types/song-library';

interface CommandPaletteProps {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Song selection handler */
  onSelectSong?: (song: Song) => void;
  /** Play song handler */
  onPlaySong?: (song: Song) => void;
  /** Navigation handler */
  onNavigate?: (path: string) => void;
  /** Action handler */
  onAction?: (action: string, data?: any) => void;
}

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  keywords: string[];
  action: () => void;
  group: 'navigation' | 'actions' | 'recent' | 'suggestions';
}

/**
 * Main Command Palette component with cmdk integration
 */
export function CommandPalette({
  isOpen,
  onClose,
  onSelectSong,
  onPlaySong,
  onNavigate,
  onAction,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const {
    searchResults,
    isSearching,
    recentSearches,
    popularSongs,
    searchSongs,
    clearSearch,
  } = useSongSearch();

  // Handle keyboard shortcuts
  useKeyboardShortcut(['cmd+k', 'ctrl+k'], (e) => {
    e.preventDefault();
    if (!isOpen) {
      // Open palette logic handled by parent
    }
  });

  // Handle escape key
  useKeyboardShortcut(['escape'], () => {
    if (isOpen) {
      handleClose();
    }
  });

  // Search when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      searchSongs(searchQuery);
    } else {
      clearSearch();
    }
  }, [searchQuery, searchSongs, clearSearch]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  const handleSongSelect = useCallback((song: Song) => {
    onSelectSong?.(song);
    handleClose();
  }, [onSelectSong, handleClose]);

  const handleSongPlay = useCallback((song: Song) => {
    onPlaySong?.(song);
    handleClose();
  }, [onPlaySong, handleClose]);

  const handleNavigation = useCallback((path: string) => {
    onNavigate?.(path);
    handleClose();
  }, [onNavigate, handleClose]);

  const handleAction = useCallback((action: string, data?: any) => {
    onAction?.(action, data);
    handleClose();
  }, [onAction, handleClose]);

  // Define command actions
  const commandActions: CommandAction[] = [
    // Navigation
    {
      id: 'nav-library',
      label: 'Song Library',
      description: 'Browse all songs',
      icon: <Music className="h-4 w-4" />,
      keywords: ['library', 'songs', 'browse', 'all'],
      action: () => handleNavigation('/media/songs'),
      group: 'navigation',
    },
    {
      id: 'nav-setlists',
      label: 'Setlists',
      description: 'Manage service setlists',
      icon: <FileText className="h-4 w-4" />,
      keywords: ['setlists', 'services', 'planning'],
      action: () => handleNavigation('/media/setlists'),
      group: 'navigation',
    },
    {
      id: 'nav-trending',
      label: 'Trending Songs',
      description: 'View popular songs',
      icon: <TrendingUp className="h-4 w-4" />,
      keywords: ['trending', 'popular', 'hot'],
      action: () => handleNavigation('/media/songs?filter=trending'),
      group: 'navigation',
    },
    {
      id: 'nav-recent',
      label: 'Recently Played',
      description: 'View recently played songs',
      icon: <Clock className="h-4 w-4" />,
      keywords: ['recent', 'played', 'history'],
      action: () => handleNavigation('/media/songs?filter=recent'),
      group: 'navigation',
    },
    
    // Actions
    {
      id: 'action-add-song',
      label: 'Add New Song',
      description: 'Create a new song',
      icon: <Plus className="h-4 w-4" />,
      keywords: ['add', 'new', 'create', 'song'],
      action: () => handleAction('add-song'),
      group: 'actions',
    },
    {
      id: 'action-import',
      label: 'Import Songs',
      description: 'Import from CSV or ChordPro',
      icon: <FileText className="h-4 w-4" />,
      keywords: ['import', 'csv', 'chordpro', 'bulk'],
      action: () => handleAction('import-songs'),
      group: 'actions',
    },
    {
      id: 'action-settings',
      label: 'Song Library Settings',
      description: 'Configure library preferences',
      icon: <Settings className="h-4 w-4" />,
      keywords: ['settings', 'preferences', 'config'],
      action: () => handleAction('open-settings'),
      group: 'actions',
    },
  ];

  // Filter actions based on search query
  const filteredActions = commandActions.filter(action => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      action.label.toLowerCase().includes(query) ||
      action.description?.toLowerCase().includes(query) ||
      action.keywords.some(keyword => keyword.includes(query))
    );
  });

  // Get default content when no search query
  const getDefaultContent = () => {
    if (recentSearches.length > 0 || popularSongs.length > 0) {
      return (
        <>
          {recentSearches.length > 0 && (
            <Command.Group heading="Recent Searches">
              {recentSearches.slice(0, 3).map((search, index) => (
                <Command.Item
                  key={`recent-${index}`}
                  value={search}
                  onSelect={() => setSearchQuery(search)}
                  className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                >
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{search}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          
          {popularSongs.length > 0 && (
            <Command.Group heading="Popular Songs">
              {popularSongs.slice(0, 5).map((song) => (
                <Command.Item
                  key={`popular-${song.id}`}
                  value={song.title}
                  onSelect={() => handleSongSelect(song)}
                  className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                >
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{song.title}</div>
                    {song.artist && (
                      <div className="text-xs text-slate-500 truncate">{song.artist}</div>
                    )}
                  </div>
                  {song.key && (
                    <Badge variant="outline" className="text-xs">
                      {song.key}
                    </Badge>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CommandIcon className="h-12 w-12 text-slate-300 mb-4" />
        <BlurText
          text="Start typing to search songs..."
          className="text-slate-500 mb-2"
          trigger="immediate"
        />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Press</span>
          <Kbd>⌘K</Kbd>
          <span>to open anytime</span>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Command Palette Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-2xl mx-4 z-50"
          >
            <Command
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              shouldFilter={false} // We handle filtering manually
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <Search className="h-5 w-5 text-slate-400" />
                <Command.Input
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder="Search songs, artists, or actions..."
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-slate-400"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSearchQuery('')}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </Button>
                )}
              </div>

              {/* Results */}
              <Command.List className="max-h-96 overflow-y-auto p-2">
                {/* Loading State */}
                {isSearching && searchQuery && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin" />
                      Searching...
                    </div>
                  </div>
                )}

                {/* No Results */}
                {!isSearching && searchQuery && searchResults.length === 0 && filteredActions.length === 0 && (
                  <Command.Empty className="flex flex-col items-center justify-center py-8 text-center">
                    <Search className="h-8 w-8 text-slate-300 mb-2" />
                    <div className="text-sm text-slate-500 mb-1">No results found</div>
                    <div className="text-xs text-slate-400">
                      Try searching for song titles, artists, or actions
                    </div>
                  </Command.Empty>
                )}

                {/* Search Results - Songs */}
                {searchResults.length > 0 && (
                  <Command.Group heading="Songs">
                    {searchResults.map((song) => (
                      <Command.Item
                        key={`song-${song.id}`}
                        value={song.title}
                        onSelect={() => handleSongSelect(song)}
                        className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md group"
                      >
                        <Music className="h-4 w-4 text-slate-400 group-hover:text-orange-500" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{song.title}</div>
                          {song.artist && (
                            <div className="text-xs text-slate-500 truncate">{song.artist}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {song.key && (
                            <Badge variant="outline" className="text-xs">
                              {song.key}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSongPlay(song);
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Actions */}
                {filteredActions.length > 0 && (
                  <Command.Group heading="Actions">
                    {filteredActions.map((action) => (
                      <Command.Item
                        key={action.id}
                        value={action.label}
                        onSelect={action.action}
                        className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                      >
                        {action.icon}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{action.label}</div>
                          {action.description && (
                            <div className="text-xs text-slate-500 truncate">{action.description}</div>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Default Content */}
                {!searchQuery && !isSearching && getDefaultContent()}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Kbd>↑↓</Kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Kbd>↵</Kbd>
                    <span>Select</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Kbd>Esc</Kbd>
                    <span>Close</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {searchResults.length > 0 && `${searchResults.length} results`}
                </div>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook for managing command palette state
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Global keyboard shortcut
  useKeyboardShortcut(['cmd+k', 'ctrl+k'], (e) => {
    e.preventDefault();
    toggle();
  });

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export default CommandPalette;