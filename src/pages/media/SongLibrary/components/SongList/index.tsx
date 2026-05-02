/**
 * Song List Component for Song Library UI Revamp
 * 
 * Compact tabular list view with:
 * - AnimatedList component for smooth item transitions
 * - Sortable columns and row interactions
 * - Responsive design with progressive disclosure
 * 
 * Requirements: 4.2, 4.4
 * Note: Virtual scrolling disabled due to Vite compatibility issues
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { FixedSizeList as List } from 'react-window'; // Disabled due to Vite issues
import { 
  Music, 
  Play, 
  MoreHorizontal, 
  ChevronUp, 
  ChevronDown,
  FileText,
  Youtube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { CoverArt } from '../CoverArt';
import { useCoverArt } from '../../hooks/useCoverArt';
import type { Song, SortField, SortDirection } from '@/types/song-library';

// Import Animation Engine components
import { 
  StaggerItem
} from '../AnimationEngine';

// Import React Bits components
import { 
  FadeContent,
  MagneticButton 
} from '../ReactBits';

interface SongListProps {
  songs: Song[];
  loading: boolean;
  selectedSongs: string[];
  onSongSelect: (song: Song) => void;
  searchQuery: string;
  filters: any;
  /** Container height for virtual scrolling */
  containerHeight?: number;
  /** Enable virtual scrolling for large collections */
  enableVirtualScrolling?: boolean;
}

// Virtual scrolling configuration (disabled)
// const ROW_HEIGHT = 64;
// const HEADER_HEIGHT = 48;

// AnimatedList component for smooth transitions
const AnimatedList = ({ children, className = '' }: { 
  children: React.ReactNode; 
  className?: string; 
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
};

export function SongList({ 
  songs, 
  loading, 
  selectedSongs, 
  onSongSelect,
  searchQuery,
  filters,
  containerHeight = 600,
  enableVirtualScrolling = true
}: SongListProps) {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine if we should use virtual scrolling
  const shouldUseVirtualScrolling = enableVirtualScrolling && songs.length > 50;

  // Handle column sorting
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Sort songs based on current sort settings
  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string)?.toLowerCase() || '';
      }
      
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [songs, sortField, sortDirection]);

  // Virtual list row renderer
  const VirtualRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const song = sortedSongs[index];
    if (!song) return null;

    return (
      <div style={style}>
        <SongRow
          song={song}
          index={index}
          isSelected={selectedSongs.includes(song.id)}
          onSelect={() => onSongSelect(song)}
        />
      </div>
    );
  }, [sortedSongs, selectedSongs, onSongSelect]);

  // Column header component
  const ColumnHeader = ({ 
    field, 
    children, 
    className = '' 
  }: { 
    field: SortField; 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <th className={`text-left ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleSort(field)}
        className="h-8 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        {children}
        {sortField === field && (
          <span className="ml-1">
            {sortDirection === 'asc' ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </span>
        )}
      </Button>
    </th>
  );

  if (loading) {
    return (
      <div ref={containerRef} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <StaggerItem key={i} variant="fade" delay={i * 0.05}>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-6 w-16" />
              </div>
            </StaggerItem>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div ref={containerRef} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-16">
        <FadeContent show={true} direction="up" duration={0.5}>
          <div className="flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Music className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            </motion.div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No songs found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              {searchQuery 
                ? `No songs match "${searchQuery}". Try adjusting your search or filters.`
                : "Add your first song to get started with your music library."
              }
            </p>
          </div>
        </FadeContent>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <table className="w-full">
          <thead>
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox />
              </th>
              <th className="w-12"></th> {/* Cover art */}
              <ColumnHeader 
                field="title" 
                className="px-2 py-3"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Title
              </ColumnHeader>
              <ColumnHeader 
                field="artist" 
                className="px-2 py-3 hidden md:table-cell"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Artist
              </ColumnHeader>
              <ColumnHeader 
                field="key" 
                className="px-2 py-3 hidden sm:table-cell"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Key
              </ColumnHeader>
              <ColumnHeader 
                field="bpm" 
                className="px-2 py-3 hidden lg:table-cell"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                BPM
              </ColumnHeader>
              <ColumnHeader 
                field="usage_count" 
                className="px-2 py-3 hidden xl:table-cell"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Uses
              </ColumnHeader>
              <th className="w-16 px-2 py-3"></th> {/* Actions */}
            </tr>
          </thead>
        </table>
      </div>

      {/* Table Body */}
      <FadeContent show={true} direction="up" duration={0.4}>
        {shouldUseVirtualScrolling ? (
          // Virtual scrolling for large collections
          <div style={{ height: containerHeight - HEADER_HEIGHT }}>
            <List
              height={containerHeight - HEADER_HEIGHT}
              itemCount={sortedSongs.length}
              itemSize={ROW_HEIGHT}
              itemData={{
                songs: sortedSongs,
                selectedSongs,
                onSongSelect
              }}
            >
              {VirtualRow}
            </List>
          </div>
        ) : (
          // Standard list with animations for smaller collections
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <tbody>
                <AnimatedList>
                  {sortedSongs.map((song, index) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={index}
                      isSelected={selectedSongs.includes(song.id)}
                      onSelect={() => onSongSelect(song)}
                    />
                  ))}
                </AnimatedList>
              </tbody>
            </table>
          </div>
        )}
      </FadeContent>
    </div>
  );
}

// Column header component with sorting
const ColumnHeader = ({ 
  field, 
  children, 
  className = '',
  sortField,
  sortDirection,
  onSort
}: { 
  field: SortField; 
  children: React.ReactNode; 
  className?: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) => (
  <th className={`text-left ${className}`}>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(field)}
      className="h-8 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
    >
      {children}
      {sortField === field && (
        <span className="ml-1">
          {sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </span>
      )}
    </Button>
  </th>
);

// Individual song row component
const SongRow = ({ 
  song, 
  index, 
  isSelected, 
  onSelect 
}: { 
  song: Song; 
  index: number; 
  isSelected: boolean; 
  onSelect: () => void; 
}) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: index * 0.02,
        duration: 0.3,
      }
    },
  };

  return (
    <motion.tr
      variants={itemVariants}
      className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
        isSelected
          ? 'bg-orange-50 dark:bg-orange-900/10'
          : ''
      }`}
      onClick={onSelect}
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        <Checkbox
          checked={isSelected}
          onChange={onSelect}
        />
      </td>

      {/* Cover Art */}
      <td className="px-2 py-3">
        <CoverArt
          songId={song.id}
          currentImageUrl={song.cover_art_url}
          currentColors={song.cover_art_colors}
          size="sm"
          editable={false} // Disable editing in list view for cleaner UI
          className="w-10 h-10"
        />
      </td>

      {/* Title */}
      <td className="px-2 py-3">
        <div>
          <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
            {song.title}
          </p>
          {song.artist && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate md:hidden">
              {song.artist}
            </p>
          )}
        </div>
      </td>

      {/* Artist */}
      <td className="px-2 py-3 hidden md:table-cell">
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {song.artist || '—'}
        </span>
      </td>

      {/* Key */}
      <td className="px-2 py-3 hidden sm:table-cell">
        {song.key ? (
          <Badge variant="outline" className="text-xs font-mono">
            {song.key}
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>

      {/* BPM */}
      <td className="px-2 py-3 hidden lg:table-cell">
        {song.bpm ? (
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {song.bpm}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>

      {/* Usage Count */}
      <td className="px-2 py-3 hidden xl:table-cell">
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {song.usage_count || 0}
        </span>
      </td>

      {/* Actions */}
      <td className="px-2 py-3">
        <div className="flex items-center gap-1">
          {/* Indicators */}
          <div className="flex items-center gap-1 mr-2">
            {(song.chords || song.chord_sheet_path) && (
              <FileText className="h-3 w-3 text-slate-400" />
            )}
            {song.video_url && (
              <Youtube className="h-3 w-3 text-slate-400" />
            )}
          </div>
          
          <MagneticButton
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              // Handle more options
            }}
          >
            <MoreHorizontal className="h-3 w-3" />
          </MagneticButton>
        </div>
      </td>
    </motion.tr>
  );
};

export default SongList;