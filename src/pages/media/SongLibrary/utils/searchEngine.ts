/**
 * Search Engine Utilities for Song Library UI Revamp
 * 
 * Advanced search functionality with:
 * - Fuzzy search using Fuse.js
 * - Multi-field search across titles, artists, lyrics, tags
 * - Search result ranking and relevance scoring
 * - Highlighted matching text
 * - Search filters and advanced queries
 * 
 * This is a placeholder implementation - will be enhanced in subsequent tasks.
 */

import Fuse from 'fuse.js';
import type { Song, SearchFilters, SearchResult } from '@/types/song-library';

// Fuse.js configuration for optimal search results
const FUSE_OPTIONS: Fuse.IFuseOptions<Song> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'artist', weight: 0.3 },
    { name: 'lyrics', weight: 0.2 },
    { name: 'tags', weight: 0.1 },
  ],
  threshold: 0.3, // Lower = more strict matching
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  findAllMatches: true,
};

/**
 * Create a search engine instance for songs
 */
export function createSearchEngine(songs: Song[]) {
  return new Fuse(songs, FUSE_OPTIONS);
}

/**
 * Perform fuzzy search across song collection
 */
export function searchSongs(
  songs: Song[], 
  query: string, 
  filters?: SearchFilters
): SearchResult[] {
  if (!query.trim()) return [];

  const fuse = createSearchEngine(songs);
  const results = fuse.search(query);

  // Transform Fuse results to SearchResult format
  let searchResults: SearchResult[] = results.map(result => ({
    song: result.item,
    relevanceScore: 1 - (result.score || 0),
    matchedFields: result.matches?.map(match => match.key as string) || [],
    highlightedText: getHighlightedText(result),
  }));

  // Apply filters if provided
  if (filters) {
    searchResults = applyFilters(searchResults, filters);
  }

  // Sort by relevance score (highest first)
  return searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Apply search filters to results
 */
function applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
  return results.filter(result => {
    const song = result.song;

    // Key filter
    if (filters.keys && filters.keys.length > 0) {
      if (!song.key || !filters.keys.includes(song.key)) {
        return false;
      }
    }

    // BPM range filter
    if (filters.bpmRange) {
      const [min, max] = filters.bpmRange;
      if (!song.bpm || song.bpm < min || song.bpm > max) {
        return false;
      }
    }

    // Time signature filter
    if (filters.timeSignatures && filters.timeSignatures.length > 0) {
      if (!song.time_signature || !filters.timeSignatures.includes(song.time_signature)) {
        return false;
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const songTags = song.tags || [];
      const hasMatchingTag = filters.tags.some(tag => 
        songTags.some(songTag => 
          songTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Has lyrics filter
    if (filters.hasLyrics !== undefined) {
      const hasLyrics = Boolean(song.lyrics && song.lyrics.trim());
      if (filters.hasLyrics !== hasLyrics) {
        return false;
      }
    }

    // Has chords filter
    if (filters.hasChords !== undefined) {
      const hasChords = Boolean(song.chords || song.chord_sheet_path);
      if (filters.hasChords !== hasChords) {
        return false;
      }
    }

    // Has cover art filter
    if (filters.hasCoverArt !== undefined) {
      const hasCoverArt = Boolean(song.cover_art_url);
      if (filters.hasCoverArt !== hasCoverArt) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extract highlighted text from Fuse.js match results
 */
function getHighlightedText(result: Fuse.FuseResult<Song>): string {
  if (!result.matches || result.matches.length === 0) {
    return result.item.title;
  }

  // Get the best match (first one, as they're sorted by score)
  const bestMatch = result.matches[0];
  
  if (bestMatch.indices && bestMatch.indices.length > 0) {
    const text = bestMatch.value || '';
    const indices = bestMatch.indices[0];
    const [start, end] = indices;
    
    return text.substring(0, start) + 
           '<mark>' + text.substring(start, end + 1) + '</mark>' + 
           text.substring(end + 1);
  }

  return bestMatch.value || result.item.title;
}

/**
 * Get popular songs based on usage analytics
 */
export function getPopularSongs(songs: Song[], limit: number = 10): Song[] {
  return songs
    .filter(song => song.usage_count > 0 || song.is_trending)
    .sort((a, b) => {
      // Prioritize trending songs
      if (a.is_trending && !b.is_trending) return -1;
      if (!a.is_trending && b.is_trending) return 1;
      
      // Then sort by usage count
      return (b.usage_count || 0) - (a.usage_count || 0);
    })
    .slice(0, limit);
}

/**
 * Get trending songs
 */
export function getTrendingSongs(songs: Song[], limit: number = 5): Song[] {
  return songs
    .filter(song => song.is_trending)
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, limit);
}

/**
 * Get recently added songs
 */
export function getRecentSongs(songs: Song[], limit: number = 5): Song[] {
  return songs
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

/**
 * Generate search suggestions based on query
 */
export function getSearchSuggestions(
  songs: Song[], 
  query: string, 
  limit: number = 5
): string[] {
  if (!query.trim()) return [];

  const suggestions = new Set<string>();
  const lowerQuery = query.toLowerCase();

  // Add matching song titles
  songs.forEach(song => {
    if (song.title.toLowerCase().includes(lowerQuery)) {
      suggestions.add(song.title);
    }
    
    // Add matching artists
    if (song.artist && song.artist.toLowerCase().includes(lowerQuery)) {
      suggestions.add(song.artist);
    }
    
    // Add matching tags
    song.tags?.forEach(tag => {
      if (tag.toLowerCase().includes(lowerQuery)) {
        suggestions.add(tag);
      }
    });
  });

  return Array.from(suggestions).slice(0, limit);
}

export default {
  createSearchEngine,
  searchSongs,
  getPopularSongs,
  getTrendingSongs,
  getRecentSongs,
  getSearchSuggestions,
};