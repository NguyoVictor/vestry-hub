/**
 * SongCard Component for Song Library UI Revamp
 * 
 * Reusable song card component with multiple variants and features:
 * - React Bits integration (SpotlightCard, TiltedCard)
 * - Trending badge support
 * - Cover art with fallback gradients
 * - Interactive hover effects
 * - Usage analytics display
 * 
 * Requirements: 4.3, 9.1, 9.2, 9.3
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Music, 
  Play, 
  Plus, 
  MoreHorizontal, 
  TrendingUp,
  Clock,
  Star,
  Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoverArt } from '../CoverArt';
import type { Song, SongCardProps } from '@/types/song-library';

// Import React Bits components (placeholder imports - these would be actual React Bits components)
import { 
  SpotlightCard, 
  TiltedCard,
  BlurText,
  MagneticButton,
  FadeContent 
} from '../ReactBits';

interface ExtendedSongCardProps extends Omit<SongCardProps, 'variant'> {
  variant?: 'standard' | 'spotlight' | 'tilted';
  size?: 'sm' | 'md' | 'lg';
  showTrendingBadge?: boolean;
  showUsageStats?: boolean;
  animationDelay?: number;
  className?: string;
}

export function SongCard({ 
  song, 
  isSelected, 
  onSelect, 
  onEdit, 
  onAddToSetlist,
  variant = 'standard',
  size = 'md',
  showTrendingBadge = true,
  showUsageStats = false,
  animationDelay = 0,
  className = ''
}: ExtendedSongCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleSelect = () => {
    onSelect(song);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(song);
  };

  const handleAddToSetlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToSetlist(song);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement play functionality
    console.log('Playing song:', song.title);
  };

  const sizeClasses = {
    sm: 'w-48 h-64',
    md: 'w-56 h-72',
    lg: 'w-64 h-80',
  };

  const formatLastPlayed = (lastPlayed: string | undefined) => {
    if (!lastPlayed) return 'Never played';
    
    const date = new Date(lastPlayed);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  // Base card content
  const cardContent = (
    <div className="relative h-full">
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
            <div className="flex items-center gap-2">
              <MagneticButton
                onClick={handlePlay}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/20"
                size="sm"
              >
                <Play className="h-4 w-4" />
              </MagneticButton>
              <MagneticButton
                onClick={handleAddToSetlist}
                className="bg-orange-500/80 backdrop-blur-sm hover:bg-orange-500 text-white border-orange-500/20"
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </MagneticButton>
            </div>
          </div>
        </FadeContent>

        {/* Trending Badge */}
        {showTrendingBadge && song.is_trending && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: animationDelay + 0.3, type: "spring" }}
            className="absolute top-2 right-2"
          >
            <Badge className="bg-orange-500 text-white text-xs font-jakarta">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Badge>
          </motion.div>
        )}

        {/* Usage Stats Badge */}
        {showUsageStats && song.usage_count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animationDelay + 0.4 }}
            className="absolute top-2 left-2"
          >
            <Badge variant="secondary" className="text-xs font-jakarta">
              <Star className="h-3 w-3 mr-1" />
              {song.usage_count}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Song Info */}
      <div className="p-4 space-y-3 flex-1">
        <div className="space-y-1">
          <BlurText
            text={song.title}
            size="md"
            trigger="inView"
            delay={animationDelay + 0.1}
            className="font-semibold text-slate-900 line-clamp-1 font-jakarta"
          />
          
          {song.artist && (
            <BlurText
              text={song.artist}
              size="sm"
              trigger="inView"
              delay={animationDelay + 0.2}
              className="text-slate-600 line-clamp-1 font-jakarta"
            />
          )}
        </div>

        {/* Metadata */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay + 0.4 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            {song.key && (
              <Badge variant="outline" className="text-xs font-mono font-jakarta">
                {song.key}
              </Badge>
            )}
            {song.bpm && (
              <Badge variant="outline" className="text-xs font-jakarta">
                {song.bpm} BPM
              </Badge>
            )}
          </div>

          {/* Usage Info */}
          {showUsageStats && (
            <div className="text-xs text-slate-500 space-y-1 font-jakarta">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatLastPlayed(song.last_played_at)}</span>
              </div>
              {song.usage_count > 0 && (
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>Used {song.usage_count} times</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay + 0.5 }}
          className="flex items-center justify-between pt-2"
        >
          <div className="flex items-center gap-1">
            {song.tags && song.tags.length > 0 && (
              <Badge variant="secondary" className="text-xs font-jakarta">
                {song.tags[0]}
              </Badge>
            )}
          </div>
          
          <MagneticButton
            onClick={handleEdit}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
            size="sm"
          >
            <MoreHorizontal className="h-3 w-3" />
          </MagneticButton>
        </motion.div>
      </div>
    </div>
  );

  // Render with appropriate wrapper based on variant
  if (variant === 'spotlight') {
    return (
      <SpotlightCard
        className={`${sizeClasses[size]} overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected
            ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900'
            : ''
        } ${className}`}
        onClick={handleSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        spotlightColor="#f97316"
        size={200}
      >
        {cardContent}
      </SpotlightCard>
    );
  }

  if (variant === 'tilted') {
    return (
      <TiltedCard
        className={`${sizeClasses[size]} overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected
            ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900'
            : ''
        } ${className}`}
        onClick={handleSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tiltMaxAngleX={15}
        tiltMaxAngleY={15}
        perspective={1000}
      >
        {cardContent}
      </TiltedCard>
    );
  }

  // Standard card
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card
        className={`${sizeClasses[size]} overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected
            ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900'
            : ''
        }`}
        onClick={handleSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-0 h-full">
          {cardContent}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default SongCard;