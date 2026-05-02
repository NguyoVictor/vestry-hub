/**
 * TiltedCard Component Integration for Song Library UI Revamp
 * 
 * Integrates React Bits TiltedCard component for interactive song cards.
 * Used for:
 * - Interactive song cards with tilt effects
 * - Hover-responsive card animations
 * - Premium card variants with physics-based interactions
 * - Grid view song displays
 * 
 * Requirements: 2.3
 */

import React from 'react';
import { TiltedCard as ReactBitsTiltedCard } from 'react-bits';
import { motion } from 'framer-motion';
import { Play, Heart, MoreHorizontal, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoverArt } from '../CoverArt';
import { BlurText } from './BlurText';
import type { Song } from '@/types/song-library';

interface TiltedCardProps {
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
  /** Tilt effect intensity (0-1) */
  tiltIntensity?: number;
  /** Custom className */
  className?: string;
  /** Whether to show metadata */
  showMetadata?: boolean;
  /** Whether to show controls */
  showControls?: boolean;
  /** Animation delay for stagger effects */
  animationDelay?: number;
  /** Whether to enable tilt physics */
  enablePhysics?: boolean;
}

const sizeClasses = {
  sm: 'w-44 h-56',
  md: 'w-52 h-64',
  lg: 'w-60 h-72',
};

/**
 * Enhanced TiltedCard wrapper that integrates React Bits TiltedCard
 * with Song Library theming and song-specific functionality
 */
export function TiltedCard({
  song,
  isSelected = false,
  onSelect,
  onPlay,
  onFavorite,
  onMoreOptions,
  size = 'md',
  tiltIntensity = 0.15,
  className,
  showMetadata = true,
  showControls = true,
  animationDelay = 0,
  enablePhysics = true,
}: TiltedCardProps) {
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
      className={cn(sizeClasses[size], className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ReactBitsTiltedCard
        className={cn(
          'relative h-full cursor-pointer overflow-hidden',
          'sl-card transition-all duration-300',
          isSelected && 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900',
          'hover:shadow-xl'
        )}
        tiltMaxAngleX={enablePhysics ? tiltIntensity * 20 : 0}
        tiltMaxAngleY={enablePhysics ? tiltIntensity * 20 : 0}
        perspective={1000}
        scale={1.02}
        transitionSpeed={400}
        gyroscope={false}
        onClick={handleCardClick}
      >
        {/* Cover Art Section */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
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
          
          {/* Key Badge */}
          {song.key && (
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: animationDelay + 0.2, type: "spring" }}
              className="absolute top-3 left-3"
            >
              <Badge className="bg-white/20 backdrop-blur-md text-white text-xs font-mono border-white/20">
                {song.key}
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
                className="bg-orange-500/90 backdrop-blur-md hover:bg-orange-600/90 text-white border-0 shadow-xl"
              >
                <Play className="h-6 w-6 ml-1" fill="currentColor" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Song Information */}
        <div className="p-4 space-y-3 bg-white dark:bg-slate-800">
          {/* Title and Artist */}
          <div className="space-y-1">
            <BlurText
              text={song.title}
              size="sm"
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
                className="sl-text-secondary line-clamp-1 text-xs"
              />
            )}
          </div>

          {/* Metadata */}
          {showMetadata && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: animationDelay + 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-1">
                {song.bpm && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {song.bpm}
                  </Badge>
                )}
                {song.time_signature && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-mono">
                    {song.time_signature}
                  </Badge>
                )}
              </div>
              
              <Music className="h-3 w-3 sl-text-muted" />
            </motion.div>
          )}

          {/* Controls */}
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: animationDelay + 0.4 }}
              className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  data-control="true"
                  onClick={handleFavoriteClick}
                  className="h-7 w-7 p-0 sl-text-muted hover:sl-text-accent-primary"
                >
                  <Heart className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                data-control="true"
                onClick={handleMoreClick}
                className="h-7 w-7 p-0 sl-text-muted hover:sl-text-primary"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </div>
      </ReactBitsTiltedCard>
    </motion.div>
  );
}

/**
 * Preset TiltedCard variants for common use cases
 */

// Interactive grid card with enhanced tilt
export function InteractiveTiltedCard({ song, onSelect, onPlay }: {
  song: Song;
  onSelect?: (song: Song) => void;
  onPlay?: (song: Song) => void;
}) {
  return (
    <TiltedCard
      song={song}
      size="md"
      tiltIntensity={0.2}
      onSelect={onSelect}
      onPlay={onPlay}
      enablePhysics={true}
      className="interactive-tilted-card"
    />
  );
}

// Compact tilted card for dense grids
export function CompactTiltedCard({ song, onSelect }: {
  song: Song;
  onSelect?: (song: Song) => void;
}) {
  return (
    <TiltedCard
      song={song}
      size="sm"
      tiltIntensity={0.1}
      onSelect={onSelect}
      showControls={false}
      showMetadata={false}
      enablePhysics={true}
      className="compact-tilted-card"
    />
  );
}

// Showcase tilted card with maximum effects
export function ShowcaseTiltedCard({ song, onSelect, onPlay }: {
  song: Song;
  onSelect?: (song: Song) => void;
  onPlay?: (song: Song) => void;
}) {
  return (
    <TiltedCard
      song={song}
      size="lg"
      tiltIntensity={0.25}
      onSelect={onSelect}
      onPlay={onPlay}
      enablePhysics={true}
      className="showcase-tilted-card border-orange-200 dark:border-orange-800"
    />
  );
}

export default TiltedCard;