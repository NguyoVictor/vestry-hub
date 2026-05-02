/**
 * Drag Preview Component
 * 
 * Renders the visual preview of items being dragged in the setlist builder.
 * Provides different preview styles for songs vs setlist items.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Music, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CoverArt } from '../CoverArt';
import type { Song, SetlistItem } from '@/types/song-library';

interface DragPreviewProps {
  item: Song | SetlistItem;
  dragType: 'song' | 'setlist_item';
  isDragging: boolean;
  opacity?: number;
  scale?: number;
  rotation?: number;
}

export function DragPreview({
  item,
  dragType,
  isDragging,
  opacity = 0.8,
  scale = 1.05,
  rotation = 2,
}: DragPreviewProps) {
  // Get song data - either directly or from setlist item
  const song = dragType === 'song' ? (item as Song) : (item as SetlistItem).song;
  
  if (!song) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1, rotate: 0 }}
      animate={{ 
        opacity: isDragging ? opacity : 1,
        scale: isDragging ? scale : 1,
        rotate: isDragging ? rotation : 0,
      }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 min-w-[280px] max-w-[320px] pointer-events-none"
      style={{
        transform: isDragging ? `scale(${scale}) rotate(${rotation}deg)` : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <GripVertical className="h-4 w-4 text-slate-400 flex-shrink-0" />
        
        {/* Cover Art */}
        <CoverArt
          songId={song.id}
          currentImageUrl={song.cover_art_url}
          currentColors={song.cover_art_colors}
          size="sm"
          editable={false}
          className="w-10 h-10 flex-shrink-0"
        />

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
            {song.title}
          </p>
          {song.artist && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {song.artist}
            </p>
          )}
        </div>

        {/* Metadata Badges */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {song.key && (
            <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5">
              {song.key}
            </Badge>
          )}
          
          {song.bpm && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {song.bpm}
            </Badge>
          )}
        </div>
      </div>

      {/* Drag Type Indicator */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Music className="h-3 w-3" />
          <span>
            {dragType === 'song' ? 'Adding to setlist' : 'Reordering'}
          </span>
        </div>
        
        {/* Visual indicator for drag state */}
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-orange-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default DragPreview;