/**
 * Search Defaults Component for Song Library UI Revamp
 * 
 * Displays default content when command palette is empty.
 * Shows recent searches, popular songs, and quick navigation options.
 * 
 * Features:
 * - Recent search history with quick access
 * - Popular songs based on usage analytics
 * - Quick navigation shortcuts
 * - Search suggestions and tips
 * 
 * Requirements: 3.5, 3.6
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  TrendingUp,
  Music,
  Search,
  Zap,
  Star,
  Play,
  Calendar,
  Users,
  FileText,
  Settings,
  Command as CommandIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';

import { BlurText } from '../ReactBits';
import type { Song } from '@/types/song-library';

interface SearchDefaultsProps {
  /** Recent search queries */
  recentSearches: string[];
  /** Popular songs to display */
  popularSongs: Song[];
  /** Recent search selection handler */
  onRecentSearchSelect: (query: string) => void;
  /** Song selection handler */
  onSongSelect: (song: Song) => void;
  /** Navigation handler */
  onNavigate: (path: string) => void;
  /** Action handler */
  onAction: (action: string) => void;
  /** Custom className */
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'tools';
}

/**
 * Default content for empty command palette
 */
export function SearchDefaults({
  recentSearches,
  popularSongs,
  onRecentSearchSelect,
  onSongSelect,
  onNavigate,
  onAction,
  className,
}: SearchDefaultsProps) {
  // Define quick actions
  const quickActions: QuickAction[] = [
    // Navigation
    {
      id: 'nav-library',
      label: 'Song Library',
      description: 'Browse all songs',
      icon: <Music className="h-4 w-4" />,
      action: () => onNavigate('/media/songs'),
      category: 'navigation',
    },
    {
      id: 'nav-setlists',
      label: 'Setlists',
      description: 'Manage service setlists',
      icon: <FileText className="h-4 w-4" />,
      action: () => onNavigate('/media/setlists'),
      category: 'navigation',
    },
    {
      id: 'nav-trending',
      label: 'Trending',
      description: 'View popular songs',
      icon: <TrendingUp className="h-4 w-4" />,
      action: () => onNavigate('/media/songs?filter=trending'),
      category: 'navigation',
    },
    
    // Actions
    {
      id: 'action-add-song',
      label: 'Add Song',
      description: 'Create a new song',
      icon: <Music className="h-4 w-4" />,
      shortcut: 'Ctrl+N',
      action: () => onAction('add-song'),
      category: 'actions',
    },
    {
      id: 'action-import',
      label: 'Import Songs',
      description: 'Bulk import from CSV',
      icon: <FileText className="h-4 w-4" />,
      action: () => onAction('import-songs'),
      category: 'actions',
    },
    
    // Tools
    {
      id: 'tool-settings',
      label: 'Settings',
      description: 'Configure preferences',
      icon: <Settings className="h-4 w-4" />,
      shortcut: 'Ctrl+,',
      action: () => onAction('open-settings'),
      category: 'tools',
    },
  ];

  // Group actions by category
  const actionsByCategory = quickActions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      className={cn('search-defaults p-4 space-y-6', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <CommandIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <BlurText
          text="Search songs, artists, or actions..."
          className="text-lg font-medium text-slate-600 mb-2"
          trigger="immediate"
        />
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <span>Press</span>
          <Kbd size="sm">⌘K</Kbd>
          <span>anytime to search</span>
        </div>
      </motion.div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Clock className="h-4 w-4" />
            Recent Searches
          </div>
          <div className="space-y-1">
            {recentSearches.slice(0, 5).map((search, index) => (
              <motion.button
                key={index}
                variants={itemVariants}
                onClick={() => onRecentSearchSelect(search)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors group"
              >
                <Search className="h-4 w-4 text-slate-400 group-hover:text-orange-500" />
                <span className="flex-1 truncate">{search}</span>
                <Zap className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Popular Songs */}
      {popularSongs.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <TrendingUp className="h-4 w-4" />
            Popular Songs
          </div>
          <div className="space-y-1">
            {popularSongs.slice(0, 5).map((song) => (
              <motion.button
                key={song.id}
                variants={itemVariants}
                onClick={() => onSongSelect(song)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors group"
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
                  <Play className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Zap className="h-4 w-4" />
          Quick Actions
        </div>

        {Object.entries(actionsByCategory).map(([category, actions]) => (
          <div key={category} className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide px-1">
              {category}
            </div>
            <div className="space-y-1">
              {actions.map((action) => (
                <motion.button
                  key={action.id}
                  variants={itemVariants}
                  onClick={action.action}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors group"
                >
                  <span className="text-slate-400 group-hover:text-orange-500">
                    {action.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{action.label}</div>
                    <div className="text-xs text-slate-500 truncate">{action.description}</div>
                  </div>
                  {action.shortcut && (
                    <Kbd size="sm" variant="ghost" className="text-xs">
                      {action.shortcut}
                    </Kbd>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Search Tips */}
      <motion.div variants={itemVariants} className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="text-xs text-slate-500 space-y-2">
          <div className="font-medium">Search Tips:</div>
          <ul className="space-y-1 text-slate-400">
            <li>• Search by song title, artist, or lyrics</li>
            <li>• Use filters to narrow results by key, BPM, or tags</li>
            <li>• Try "trending" or "unused" for quick filters</li>
            <li>• Press <Kbd size="sm" variant="ghost">↑↓</Kbd> to navigate results</li>
          </ul>
        </div>
      </motion.div>

      {/* Keyboard Shortcuts */}
      <motion.div variants={itemVariants} className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="text-xs text-slate-500 space-y-2">
          <div className="font-medium">Keyboard Shortcuts:</div>
          <div className="grid grid-cols-2 gap-2 text-slate-400">
            <div className="flex items-center justify-between">
              <span>Search</span>
              <Kbd size="sm" variant="ghost">⌘K</Kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Navigate</span>
              <Kbd size="sm" variant="ghost">↑↓</Kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Select</span>
              <Kbd size="sm" variant="ghost">↵</Kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Close</span>
              <Kbd size="sm" variant="ghost">Esc</Kbd>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Empty state when no recent searches or popular songs
 */
export function EmptySearchDefaults({
  onAction,
  className,
}: {
  onAction: (action: string) => void;
  className?: string;
}) {
  return (
    <motion.div
      className={cn('empty-search-defaults p-8 text-center space-y-6', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <Search className="h-16 w-16 text-slate-200 mx-auto mb-4" />
        <BlurText
          text="Start searching to discover songs"
          className="text-xl font-medium text-slate-600 mb-2"
          trigger="immediate"
        />
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Search by song title, artist, lyrics, or use filters to find exactly what you're looking for.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => onAction('add-song')}
          className="flex items-center gap-2"
        >
          <Music className="h-4 w-4" />
          Add Your First Song
        </Button>
        <Button
          variant="outline"
          onClick={() => onAction('import-songs')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Import Songs
        </Button>
      </div>

      <div className="text-xs text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span>Press</span>
          <Kbd size="sm">⌘K</Kbd>
          <span>to search anytime</span>
        </div>
      </div>
    </motion.div>
  );
}

export default SearchDefaults;