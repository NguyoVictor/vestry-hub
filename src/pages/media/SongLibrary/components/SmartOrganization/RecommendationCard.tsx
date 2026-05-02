/**
 * RecommendationCard Component for Song Library UI Revamp
 * 
 * Displays individual song recommendations with reasoning and actions
 * Includes smart recommendation scoring and contextual information
 * 
 * Requirements: 9.4, 9.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Plus, 
  Star, 
  TrendingUp, 
  Clock, 
  Music,
  Zap,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Song } from '@/types/song-library';

interface RecommendationCardProps {
  song: Song & {
    recommendation_score?: number;
    recommendation_reason?: string;
  };
  onSelect?: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  className?: string;
}

export function RecommendationCard({ 
  song, 
  onSelect, 
  onAddToSetlist,
  className = '' 
}: RecommendationCardProps) {
  const handleSelect = () => {
    onSelect?.(song);
  };

  const handleAddToSetlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToSetlist?.(song);
  };

  const getReasonIcon = (reason: string) => {
    if (reason.includes('trending') || reason.includes('Trending')) {
      return <TrendingUp className="h-4 w-4" />;
    }
    if (reason.includes('popular') || reason.includes('Popular')) {
      return <Star className="h-4 w-4" />;
    }
    if (reason.includes('recent') || reason.includes('Recent')) {
      return <Clock className="h-4 w-4" />;
    }
    if (reason.includes('fit') || reason.includes('Good')) {
      return <Zap className="h-4 w-4" />;
    }
    return <Music className="h-4 w-4" />;
  };

  const getReasonColor = (reason: string) => {
    if (reason.includes('trending') || reason.includes('Trending')) {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    }
    if (reason.includes('popular') || reason.includes('Popular')) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
    if (reason.includes('recent') || reason.includes('Recent')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (reason.includes('fit') || reason.includes('Good')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
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
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-slate-600';
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-l-4 border-l-orange-500"
        onClick={handleSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Song Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                {/* Cover Art or Gradient */}
                <div className="flex-shrink-0">
                  {song.cover_art_url ? (
                    <img
                      src={song.cover_art_url}
                      alt={`${song.title} cover`}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center"
                    >
                      <Music className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Song Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 truncate font-jakarta">
                    {song.title}
                  </h4>
                  {song.artist && (
                    <p className="text-sm text-slate-600 truncate font-jakarta">
                      {song.artist}
                    </p>
                  )}
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    {song.key && (
                      <span className="font-jakarta">Key: {song.key}</span>
                    )}
                    {song.bpm && (
                      <span className="font-jakarta">BPM: {song.bpm}</span>
                    )}
                    <span className="font-jakarta">
                      Used: {song.usage_count || 0} times
                    </span>
                  </div>

                  {/* Last Played */}
                  <p className="text-xs text-slate-400 mt-1 font-jakarta">
                    Last played: {formatLastPlayed(song.last_played_at)}
                  </p>
                </div>
              </div>

              {/* Recommendation Reason */}
              {song.recommendation_reason && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-jakarta ${getReasonColor(song.recommendation_reason)}`}
                  >
                    {getReasonIcon(song.recommendation_reason)}
                    <span className="ml-1">{song.recommendation_reason}</span>
                  </Badge>
                  
                  {song.recommendation_score && (
                    <span className={`text-xs font-semibold font-jakarta ${getScoreColor(song.recommendation_score)}`}>
                      Score: {Math.round(song.recommendation_score)}
                    </span>
                  )}
                </div>
              )}

              {/* Tags */}
              {song.tags && song.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {song.tags.slice(0, 3).map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="text-xs font-jakarta"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {song.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs font-jakarta">
                      +{song.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelect}
                className="font-jakarta"
              >
                <Play className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                onClick={handleAddToSetlist}
                className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Trending Indicator */}
          {song.is_trending && (
            <div className="mt-3 flex items-center gap-2 text-orange-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium font-jakarta">Trending Now</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default RecommendationCard;