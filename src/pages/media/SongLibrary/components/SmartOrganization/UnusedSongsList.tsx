/**
 * UnusedSongsList Component for Song Library UI Revamp
 * 
 * Displays list of songs that haven't been used recently
 * Helps worship leaders identify forgotten songs in their repertoire
 * 
 * Requirements: 9.6, 9.7
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Plus, 
  Play, 
  AlertTriangle,
  Music,
  Calendar,
  Search,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { Song } from '@/types/song-library';

interface UnusedSongsListProps {
  songs: Song[];
  onSongSelect?: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  className?: string;
}

type SortField = 'title' | 'artist' | 'created_at' | 'last_played_at' | 'usage_count';
type SortDirection = 'asc' | 'desc';

export function UnusedSongsList({ 
  songs, 
  onSongSelect, 
  onAddToSetlist,
  className = '' 
}: UnusedSongsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showOnlyNeverUsed, setShowOnlyNeverUsed] = useState(false);

  // Filter songs based on search and filters
  const filteredSongs = songs.filter(song => {
    const matchesSearch = !searchQuery || 
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (song.artist && song.artist.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = !showOnlyNeverUsed || 
      song.usage_count === 0 || 
      !song.last_played_at;
    
    return matchesSearch && matchesFilter;
  });

  // Sort songs
  const sortedSongs = [...filteredSongs].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // Convert to comparable values
    if (sortField === 'created_at' || sortField === 'last_played_at') {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="h-3 w-3" /> : 
      <SortDesc className="h-3 w-3" />;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 30) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 365) {
      return `${Math.floor(diffInDays / 30)} months ago`;
    } else {
      return `${Math.floor(diffInDays / 365)} years ago`;
    }
  };

  const getUnusedSeverity = (song: Song) => {
    if (!song.last_played_at || song.usage_count === 0) {
      return 'never';
    }
    
    const daysSinceLastUse = Math.floor(
      (new Date().getTime() - new Date(song.last_played_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastUse > 365) return 'critical';
    if (daysSinceLastUse > 180) return 'high';
    if (daysSinceLastUse > 90) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'never': return 'bg-red-100 text-red-700 border-red-200';
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'never': return 'Never Used';
      case 'critical': return '1+ Year';
      case 'high': return '6+ Months';
      case 'medium': return '3+ Months';
      case 'low': return 'Recent';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search unused songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-jakarta"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={showOnlyNeverUsed ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowOnlyNeverUsed(!showOnlyNeverUsed)}
            className="font-jakarta"
          >
            <Filter className="h-4 w-4 mr-1" />
            Never Used Only
          </Button>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-slate-500 font-jakarta">Sort by:</span>
        {[
          { field: 'title' as SortField, label: 'Title' },
          { field: 'artist' as SortField, label: 'Artist' },
          { field: 'created_at' as SortField, label: 'Date Added' },
          { field: 'last_played_at' as SortField, label: 'Last Played' },
          { field: 'usage_count' as SortField, label: 'Usage Count' },
        ].map(({ field, label }) => (
          <Button
            key={field}
            variant={sortField === field ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleSort(field)}
            className="font-jakarta text-xs h-7"
          >
            {label}
            {getSortIcon(field)}
          </Button>
        ))}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span className="font-jakarta">
          {sortedSongs.length} unused songs
          {showOnlyNeverUsed && ' (never used)'}
        </span>
        {sortedSongs.length > 0 && (
          <span className="font-jakarta">
            Showing {Math.min(20, sortedSongs.length)} of {sortedSongs.length}
          </span>
        )}
      </div>

      {/* Songs List */}
      <div className="space-y-2">
        <AnimatePresence>
          {sortedSongs.slice(0, 20).map((song, index) => {
            const severity = getUnusedSeverity(song);
            
            return (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <UnusedSongCard
                  song={song}
                  severity={severity}
                  onSelect={onSongSelect}
                  onAddToSetlist={onAddToSetlist}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {sortedSongs.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-jakarta">
            {searchQuery ? 'No unused songs match your search' : 'No unused songs found'}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-jakarta">
            {searchQuery ? 'Try adjusting your search terms' : 'All songs have been used recently!'}
          </p>
        </div>
      )}

      {/* Load More */}
      {sortedSongs.length > 20 && (
        <div className="text-center pt-4">
          <Button variant="outline" className="font-jakarta">
            Load More ({sortedSongs.length - 20} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

interface UnusedSongCardProps {
  song: Song;
  severity: string;
  onSelect?: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
}

function UnusedSongCard({ song, severity, onSelect, onAddToSetlist }: UnusedSongCardProps) {
  const handleSelect = () => {
    onSelect?.(song);
  };

  const handleAddToSetlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToSetlist?.(song);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'never': return 'bg-red-100 text-red-700 border-red-200';
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'never': return 'Never Used';
      case 'critical': return '1+ Year';
      case 'high': return '6+ Months';
      case 'medium': return '3+ Months';
      case 'low': return 'Recent';
      default: return 'Unknown';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={handleSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Cover Art or Icon */}
            <div className="flex-shrink-0">
              {song.cover_art_url ? (
                <img
                  src={song.cover_art_url}
                  alt={`${song.title} cover`}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Music className="h-5 w-5 text-slate-400" />
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
              
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                <span className="font-jakarta">
                  Added: {formatDate(song.created_at)}
                </span>
                <span className="font-jakarta">
                  Used: {song.usage_count || 0} times
                </span>
                <span className="font-jakarta">
                  Last: {formatDate(song.last_played_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Severity Badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Badge 
              variant="outline" 
              className={`text-xs font-jakarta ${getSeverityColor(severity)}`}
            >
              {severity === 'never' ? (
                <AlertTriangle className="h-3 w-3 mr-1" />
              ) : (
                <Clock className="h-3 w-3 mr-1" />
              )}
              {getSeverityLabel(severity)}
            </Badge>

            {/* Actions */}
            <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
}

export default UnusedSongsList;