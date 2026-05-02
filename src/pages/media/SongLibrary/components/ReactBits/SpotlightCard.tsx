/**
 * SpotlightCard Component Integration for Song Library UI Revamp
 * 
 * Integrates React Bits SpotlightCard component for featured song displays.
 * Used for:
 * - Featured/trending songs with spotlight effects
 * - Song cards with interactive spotlight following cursor
 * - Premium card variants with enhanced visual appeal
 * - Setlist highlight cards
 * 
 * Requirements: 2.2
 */

import React from 'react';
import { SpotlightCard as ReactBitsSpotlightCard } from 'react-bits';
import { motion } from 'framer-motion';
import { Play, Heart, MoreHorizontal, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoverArt } from '../CoverArt';
import { BlurText } from './BlurText';
import type { Song } from '@/types/song-library';

interface SpotlightCardProps {
  /** Song data to display */
  song: Song;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Click handler for song selection */
  onSelect?: (song: Song) => void;
  /** Play button click handler */
  onPlay?: (song: Song) => void;
  /** Favorite toggle handler */
  onFavorite?: (song: Song) => void;
  /** More options handler */
  onMoreOptions?: (song: Song) => void;
  /** Card size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Spotlight effect intensity */
  spotlightIntensity?: number;
  /** Custom className */
  className?: string;
  /** Whether to show metadata */
  showMetadata?: boolean;
  /** Whether to show controls */
  showControls?: boolean;
  /** Animation delay for stagger effects */
  animationDelay?: number;
}

const sizeClasses = {
  sm: 'w-48 h-64',
  md: 'w-56 h-72',
  lg: 'w-64 h-80',
};

/**
 * Enhanced SpotlightCard wrapper that integrates React Bits SpotlightCard
 * with Song Library theming and song-specific functionality
 */
export function SpotlightCard({
  song,
  isSelected = false,
  onSelect,
  onPlay,
  onFavorite,
  onMoreOptions,
  size = 'md',
  spotlightIntensity = 0.8,
  className,
  showMetadata = true,
  showControls = true,
  animationDelay = 0,
}: SpotlightCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on controls
    if ((e.target as HTMLElement).closest('[data-control]')) {
      return;
    }
    onSelect?.(song);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay?.(song);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite?.(song);
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoreOptions?.(song);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: animationDelay,
        ease: [0.4, 0.0, 0.2, 1] 
      }}
      whileHover={{ y: -4 }}
      className={cn(sizeClasses[size], className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ReactBitsSpotlightCard
        className={cn(
          'relative h-full cursor-pointer overflow-hidden',
          'sl-card transition-all duration-300',
          isSelected && 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900',
          'hover:shadow-xl'
        )}
        spotlightColor="rgba(249, 115, 22, 0.3)" // Orange spotlight
        spotlightSize={120}
        intensity={spotlightIntensity}
        onClick={handleCardClick}
      >
        {/* Cover Art Section */}
        <div className="relative aspect-square overflow-hidden">
          <CoverArt
            songId={song.id}
            currentImageUrl={song.cover_art_url}
            currentColors={song.cover_art_colors}
            size="lg"
            editable={false}
            className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Trending Badge */}
          {song.is_trending && (
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: animationDelay + 0.3, type: "spring" }}
              className="absolute top-3 right-3"
            >
              <Badge className="bg-orange-500 text-white text-xs font-semibold shadow-lg">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </Badge>
            </motion.div>
          )}

          {/* Play Button Overlay */}
          {showControls && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: isHovered ? 1 : 0, 
                scale: isHovered ? 1 : 0.8 
              }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Button
                size="lg"
                data-control="true"
                onClick={handlePlayClick}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border-white/20 shadow-xl"
              >
                <Play className="h-6 w-6 ml-1" fill="currentColor" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Song Information */}
        <div className="p-4 space-y-3">
          {/* Title and Artist */}
          <div className="space-y-1">
            <BlurText
              text={song.title}
              size="md"
              trigger="inView"
              delay={animationDelay + 0.1}
              className="font-semibold sl-text-primary line-clamp-1"
            />
            
            {song.artist && (
              <BlurText
                text={song.artist}
                size="sm"
                trigger="inView"
                delay={animationDelay + 0.2}
                className="sl-text-secondary line-clamp-1"
              />
            )}
          </div>

          {/* Metadata */}
          {showMetadata && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: animationDelay + 0.4 }}
              className="flex items-center justify-between"
            >
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
              
              {song.usage_count > 0 && (
                <span className="text-xs sl-text-muted">
                  Used {song.usage_count} times
                </span>
              )}
            </motion.div>
          )}

          {/* Controls */}
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: animationDelay + 0.5 }}
              className="flex items-center justify-between pt-2"
            >
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  data-control="true"
                  onClick={handleFavoriteClick}
                  className="h-8 w-8 p-0 sl-text-muted hover:sl-text-accent-primary"
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                data-control="true"
                onClick={handleMoreClick}
                className="h-8 w-8 p-0 sl-text-muted hover:sl-text-primary"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </ReactBitsSpotlightCard>
    </motion.div>
  );
}

/**
 * Preset SpotlightCard variants for common use cases
 */

// Featured song card with enhanced spotlight
export function FeaturedSongCard({ song, onSelect, onPlay }: {
  song: Song;
  onSelect?: (song: Song) => void;
  onPlay?: (song: Song) => void;
}) {
  return (
    <SpotlightCard
      song={song}
      size="lg"
      spotlightIntensity={1.2}
      onSelect={onSelect}
      onPlay={onPlay}
      className="featured-song-card"
    />
  );
}

// Compact spotlight card for lists
export function CompactSpotlightCard({ song, onSelect }: {
  song: Song;
  onSelect?: (song: Song) => void;
}) {
  return (
    <SpotlightCard
      song={song}
      size="sm"
      spotlightIntensity={0.6}
      onSelect={onSelect}
      showControls={false}
      showMetadata={false}
      className="compact-spotlight-card"
    />
  );
}

// Trending song card with special effects
export function TrendingSongCard({ song, onSelect, onPlay }: {
  song: Song;
  onSelect?: (song: Song) => void;
  onPlay?: (song: Song) => void;
}) {
  return (
    <SpotlightCard
      song={song}
      size="md"
      spotlightIntensity={1.0}
      onSelect={onSelect}
      onPlay={onPlay}
      className="trending-song-card border-orange-200 dark:border-orange-800"
    />
  );
}

export default SpotlightCard;