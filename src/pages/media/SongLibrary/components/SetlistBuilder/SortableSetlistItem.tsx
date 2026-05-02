/**
 * Sortable Setlist Item Component
 * 
 * Individual setlist item that can be dragged and reordered within the setlist.
 * Integrates with @dnd-kit for smooth drag-and-drop interactions.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { 
  GripVertical, 
  Play, 
  MoreHorizontal, 
  Clock,
  Music2,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CoverArt } from '../CoverArt';
import type { SetlistItem, Song } from '@/types/song-library';

interface SortableSetlistItemProps {
  item: SetlistItem;
  song: Song;
  index: number;
  isSelected?: boolean;
  onSelect?: (item: SetlistItem) => void;
  onEdit?: (item: SetlistItem) => void;
  onRemove?: (item: SetlistItem) => void;
  onPlay?: (song: Song) => void;
  showKeyTransitions?: boolean;
  keyTransition?: {
    from_key: string;
    to_key: string;
    difficulty: 'smooth' | 'moderate' | 'difficult';
  };
}

export function SortableSetlistItem({
  item,
  song,
  index,
  isSelected = false,
  onSelect,
  onEdit,
  onRemove,
  onPlay,
  showKeyTransitions = false,
  keyTransition,
}: SortableSetlistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id: item.id,
    data: {
      type: 'setlist_item',
      item,
      song,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate duration display
  const duration = item.duration_override || song.duration_seconds;
  const durationDisplay = duration 
    ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
    : null;

  // Determine key to display (override or original)
  const displayKey = item.key_override || song.key;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        group relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
        ${isDragging 
          ? 'bg-slate-100 dark:bg-slate-700 border-orange-300 dark:border-orange-600 shadow-lg z-50' 
          : isOver
          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
          : isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
        }
        ${isDragging ? 'cursor-grabbing' : 'cursor-default'}
      `}
      onClick={() => onSelect?.(item)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <GripVertical className="h-4 w-4 text-slate-400" />
      </div>

      {/* Position Number */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {index + 1}
      </div>

      {/* Cover Art */}
      <CoverArt
        songId={song.id}
        currentImageUrl={song.cover_art_url}
        currentColors={song.cover_art_colors}
        size="sm"
        editable={false}
        className="w-10 h-10 flex-shrink-0"
      />

      {/* Song Information */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
              {song.title}
            </p>
            {song.artist && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {song.artist}
              </p>
            )}
            
            {/* Notes if present */}
            {item.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                {item.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Key Transition Indicator */}
      {showKeyTransitions && keyTransition && (
        <div className="flex items-center gap-1 text-xs">
          <Badge 
            variant="outline" 
            className={`
              ${keyTransition.difficulty === 'smooth' 
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50' 
                : keyTransition.difficulty === 'moderate'
                ? 'border-amber-300 text-amber-700 bg-amber-50'
                : 'border-red-300 text-red-700 bg-red-50'
              }
            `}
          >
            {keyTransition.from_key} → {keyTransition.to_key}
          </Badge>
        </div>
      )}

      {/* Metadata Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {displayKey && (
          <Badge 
            variant={item.key_override ? "default" : "outline"} 
            className="text-xs font-mono"
          >
            {displayKey}
            {item.key_override && (
              <span className="ml-1 text-xs opacity-75">*</span>
            )}
          </Badge>
        )}
        
        {song.bpm && (
          <Badge variant="secondary" className="text-xs">
            {song.bpm} BPM
          </Badge>
        )}

        {durationDisplay && (
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            <span>{durationDisplay}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.(song);
          }}
        >
          <Play className="h-3 w-3" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit?.(item)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPlay?.(song)}>
              <Play className="h-4 w-4 mr-2" />
              Preview Song
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Music2 className="h-4 w-4 mr-2" />
              View Song Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onRemove?.(item)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from Setlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Drag Overlay Indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-orange-100 dark:bg-orange-900/30 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg pointer-events-none" />
      )}
    </motion.div>
  );
}

export default SortableSetlistItem;