/**
 * Song Grid Component for Song Library UI Revamp
 * 
 * Enhanced grid view implementation with:
 * - React Bits premium components (SpotlightCard, TiltedCard, BlurText)
 * - Stagger animations for card grids using Animation Engine
 * - Virtual scrolling for large collections using react-window
 * - Responsive grid layout with proper spacing
 * - Cover art display with fallback gradients
 * - Premium hover effects and micro-animations
 * 
 * Requirements: 4.1, 4.3, 11.1 (Virtual scrolling for performance)
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Music, Play, Heart, MoreHorizontal, Grid3X3 } from 'lucide-react';
// import { FixedSizeGrid as Grid } from 'react-window'; // Disabled due to Vite issues
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CoverArt } from '../CoverArt';
import { useCoverArt } from '../../hooks/useCoverArt';

// Import React Bits components
import { 
  SpotlightCard, 
  TiltedCard, 
  BlurText,
  MagneticButton,
  FadeContent 
} from '../ReactBits';

// Import Animation Engine
import { 
  StaggerContainer, 
  StaggerItem, 
  AnimatedCard,
  LoadingAnimation 
} from '../AnimationEngine';

import type { Song } from '@/types/song-library';

interface SongGridProps {
  songs: Song[];
  loading: boolean;
  selectedSongs: string[];
  onSongSelect: (song: Song) => void;
  onAddSong?: () => void;
  searchQuery: string;
  filters: any;
  /** Grid display variant */
  variant?: 'standard' | 'spotlight' | 'tilted' | 'mixed';
  /** Card size */
  cardSize?: 'sm' | 'md' | 'lg';
  /** Container height for virtual scrolling */
  containerHeight?: number;
  /** Enable virtual scrolling for large collections */
  enableVirtualScrolling?: boolean;
  /** Enable lazy loading for images */
  enableLazyLoading?: boolean;
  /** Scroll position callback */
  onScroll?: (position: number) => void;
  /** Mobile responsive configuration */
  isMobile?: boolean;
  isTouch?: boolean;
  optimalImageSize?: 'sm' | 'md' | 'lg' | 'xl';
}

// Virtual scrolling configuration
const CARD_SIZES = {
  sm: { width: 200, height: 280 },
  md: { width: 240, height: 320 },
  lg: { width: 280, height: 360 },
};

const GRID_GAP = 24;
const CONTAINER_PADDING = 24;

export function SongGrid({ 
  songs, 
  loading, 
  selectedSongs, 
  onSongSelect,
  onAddSong,
  searchQuery,
  filters,
  variant = 'mixed',
  cardSize = 'md',
  containerHeight = 600,
  enableVirtualScrolling = true,
  enableLazyLoading = true,
  onScroll,
  isMobile = false,
  isTouch = false,
  optimalImageSize = 'md'
}: SongGridProps) {
  const { uploadCoverArt, removeCoverArt } = useCoverArt();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [columnsPerRow, setColumnsPerRow] = useState(4);

  // Calculate grid dimensions for virtual scrolling
  const cardDimensions = CARD_SIZES[cardSize];
  
  // Mobile-specific adjustments
  const mobileCardSize = isMobile ? 'sm' : cardSize;
  const mobileDimensions = CARD_SIZES[mobileCardSize];
  const actualDimensions = isMobile ? mobileDimensions : cardDimensions;
  
  // Update container width and columns on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        
        // Calculate how many columns fit with gaps and padding
        const availableWidth = width - (CONTAINER_PADDING * 2);
        const cardWithGap = actualDimensions.width + GRID_GAP;
        let columns = Math.floor((availableWidth + GRID_GAP) / cardWithGap);
        
        // Force single column on mobile for better UX
        if (isMobile) {
          columns = 1;
        }
        
        setColumnsPerRow(Math.max(1, columns));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [actualDimensions.width, isMobile]);

  // Calculate virtual grid dimensions
  const rowCount = Math.ceil(songs.length / columnsPerRow);
  const rowHeight = actualDimensions.height + GRID_GAP;

  // Determine if we should use virtual scrolling (disable on mobile for better touch experience)
  const shouldUseVirtualScrolling = enableVirtualScrolling && songs.length > 20 && !isMobile;

  // Virtual grid cell renderer
  const VirtualGridCell = useCallback(({ columnIndex, rowIndex, style }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    const songIndex = rowIndex * columnsPerRow + columnIndex;
    const song = songs[songIndex];
    
    if (!song) {
      return <div style={style} />;
    }

    return (
      <div style={{
        ...style,
        padding: GRID_GAP / 2,
      }}>
        {renderSongCard(song, songIndex)}
      </div>
    );
  }, [songs, columnsPerRow, selectedSongs, onSongSelect, variant, cardSize]);

  // Handle song play
  const handleSongPlay = useCallback((song: Song) => {
    console.log('Playing song:', song.title);
    // TODO: Implement actual play functionality
  }, []);

  // Handle song favorite
  const handleSongFavorite = useCallback((song: Song) => {
    console.log('Toggling favorite for song:', song.title);
    // TODO: Implement favorite functionality
  }, []);

  // Handle more options
  const handleMoreOptions = useCallback((song: Song) => {
    console.log('More options for song:', song.title);
    // TODO: Implement more options menu
  }, []);

  // Render song card based on variant and position
  const renderSongCard = useCallback((song: Song, index: number) => {
    const isSelected = selectedSongs.includes(song.id);
    const animationDelay = index * 0.05; // Stagger delay

    // Determine card type based on variant and song properties
    let CardComponent;
    let cardProps = {};

    if (variant === 'mixed') {
      // Use different card types based on song properties and position
      if (song.is_trending && index < 3) {
        CardComponent = SpotlightCard;
        cardProps = { size: cardSize, spotlightIntensity: 1.0 };
      } else if (index % 4 === 0) {
        CardComponent = TiltedCard;
        cardProps = { size: cardSize, tiltIntensity: 0.8 };
      } else {
        CardComponent = StandardSongCard;
        cardProps = { size: cardSize };
      }
    } else if (variant === 'spotlight') {
      CardComponent = SpotlightCard;
      cardProps = { size: cardSize, spotlightIntensity: 0.8 };
    } else if (variant === 'tilted') {
      CardComponent = TiltedCard;
      cardProps = { size: cardSize, tiltIntensity: 0.8 };
    } else {
      CardComponent = StandardSongCard;
      cardProps = { size: cardSize };
    }

    return (
      <StaggerItem key={song.id} variant="stagger" delay={animationDelay * 0.1}>
        <CardComponent
          song={song}
          isSelected={isSelected}
          onSelect={onSongSelect}
          onPlay={handleSongPlay}
          onFavorite={handleSongFavorite}
          onMoreOptions={handleMoreOptions}
          animationDelay={animationDelay}
          {...cardProps}
        />
      </StaggerItem>
    );
  }, [
    selectedSongs, 
    onSongSelect, 
    handleSongPlay, 
    handleSongFavorite, 
    handleMoreOptions,
    variant,
    cardSize
  ]);

  if (loading) {
    return (
      <div ref={containerRef} className="w-full">
        <div className={`grid gap-6 ${
          isMobile 
            ? 'grid-cols-1' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
        }`}>
          {Array.from({ length: isMobile ? 4 : 10 }).map((_, i) => (
            <StaggerItem key={i} variant="scale" delay={i * 0.05}>
              <Card className="overflow-hidden sl-card">
                <CardContent className="p-0">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div ref={containerRef} className="w-full">
        <FadeContent show={true} direction="up" duration={0.5}>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Grid3X3 className="h-16 w-16 sl-text-muted mb-6" />
            </motion.div>
            
            <BlurText
              text="No songs found"
              size="xl"
              trigger="inView"
              className="font-semibold sl-text-primary mb-2"
            />
            
            <BlurText
              text={searchQuery 
                ? `No songs match "${searchQuery}". Try adjusting your search or filters.`
                : "Add your first song to get started with your music library."
              }
              size="md"
              trigger="inView"
              delay={0.2}
              className="sl-text-secondary max-w-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6"
            >
              <MagneticButton
                className="sl-button-primary"
                onClick={onAddSong}
              >
                <Music className="h-4 w-4 mr-2" />
                Add Your First Song
              </MagneticButton>
            </motion.div>
          </div>
        </FadeContent>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <FadeContent show={true} direction="up" duration={0.4}>
        {shouldUseVirtualScrolling ? (
          // Virtual scrolling for large collections (desktop only)
          <div className="w-full" style={{ height: containerHeight }}>
            <Grid
              columnCount={columnsPerRow}
              columnWidth={actualDimensions.width + GRID_GAP}
              height={containerHeight}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={containerWidth}
              itemData={{
                songs,
                columnsPerRow,
                selectedSongs,
                onSongSelect,
                variant,
                cardSize: mobileCardSize,
                renderSongCard,
                isMobile,
                isTouch,
                optimalImageSize
              }}
              onScroll={({ scrollTop, scrollHeight, clientHeight }) => {
                if (onScroll) {
                  const scrollPosition = scrollTop / (scrollHeight - clientHeight);
                  onScroll(scrollPosition);
                }
              }}
            >
              {VirtualGridCell}
            </Grid>
          </div>
        ) : (
          // Standard grid for smaller collections or mobile
          <StaggerContainer 
            variant="normal"
            className={`grid gap-6 ${
              isMobile 
                ? 'grid-cols-1' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
            }`}
          >
            {songs.map((song, index) => renderSongCard(song, index))}
          </StaggerContainer>
        )}
      </FadeContent>
    </div>
  );
}

// Standard song card component (fallback for non-React Bits cards)
function StandardSongCard({ 
  song, 
  isSelected, 
  onSelect, 
  onPlay, 
  onFavorite, 
  onMoreOptions,
  size = 'md',
  animationDelay = 0 
}: {
  song: Song;
  isSelected: boolean;
  onSelect: (song: Song) => void;
  onPlay: (song: Song) => void;
  onFavorite: (song: Song) => void;
  onMoreOptions: (song: Song) => void;
  size?: 'sm' | 'md' | 'lg';
  animationDelay?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-48 h-64',
    md: 'w-56 h-72',
    lg: 'w-64 h-80',
  };

  return (
    <AnimatedCard
      variant="normal"
      className={`${sizeClasses[size]} overflow-hidden sl-card transition-all duration-300 ${
        isSelected
          ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900'
          : ''
      }`}
      onClick={() => onSelect(song)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Art */}
      <div className="relative aspect-square">
        <CoverArt
          songId={song.id}
          currentImageUrl={song.cover_art_url}
          currentColors={song.cover_art_colors}
          size="lg"
          editable={false}
          className="w-full h-full transition-transform duration-300"
        />
        
        {/* Overlay Controls */}
        <FadeContent show={isHovered} duration={0.2}>
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <MagneticButton
              onClick={(e) => {
                e.stopPropagation();
                onPlay(song);
              }}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/20"
            >
              <Play className="h-4 w-4" />
            </MagneticButton>
          </div>
        </FadeContent>

        {/* Trending Badge */}
        {song.is_trending && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: animationDelay + 0.3, type: "spring" }}
            className="absolute top-2 right-2"
          >
            <Badge className="bg-orange-500 text-white text-xs">
              Trending
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Song Info */}
      <div className="p-4 space-y-3">
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
                {song.bpm}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {song.usage_count > 0 && (
              <span className="text-xs sl-text-muted">
                {song.usage_count}
              </span>
            )}
            <MagneticButton
              onClick={(e) => {
                e.stopPropagation();
                onMoreOptions(song);
              }}
              className="h-6 w-6 p-0 sl-text-muted hover:sl-text-primary"
            >
              <MoreHorizontal className="h-3 w-3" />
            </MagneticButton>
          </div>
        </motion.div>
      </div>
    </AnimatedCard>
  );
}

export default SongGrid;