/**
 * Usage Tracking Utilities for Song Library UI Revamp
 * 
 * Utility functions for tracking song usage, calculating trends,
 * and managing usage analytics data.
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

import type { Song, ServiceType, TrackUsageRequest } from '@/types/song-library';

// =====================================================
// Usage Tracking Helpers
// =====================================================

/**
 * Create a usage tracking request for a song
 */
export function createUsageRequest(
  songId: string,
  options: {
    serviceType?: ServiceType;
    setlistId?: string;
    keyUsed?: string;
    durationPlayed?: number;
  } = {}
): TrackUsageRequest {
  return {
    song_id: songId,
    service_type: options.serviceType,
    setlist_id: options.setlistId,
    key_used: options.keyUsed,
    duration_played: options.durationPlayed,
  };
}

/**
 * Create bulk usage requests for multiple songs (e.g., from a setlist)
 */
export function createBulkUsageRequests(
  songs: Array<{
    songId: string;
    keyUsed?: string;
    durationPlayed?: number;
  }>,
  options: {
    serviceType?: ServiceType;
    setlistId?: string;
  } = {}
): TrackUsageRequest[] {
  return songs.map(song => createUsageRequest(song.songId, {
    ...options,
    keyUsed: song.keyUsed,
    durationPlayed: song.durationPlayed,
  }));
}

// =====================================================
// Trending Calculation Helpers
// =====================================================

/**
 * Calculate trending score for a song based on usage patterns
 */
export function calculateTrendingScore(
  recentUsage: number,
  previousUsage: number,
  totalUsage: number,
  daysSinceLastUse: number
): number {
  // Base score from recent usage
  let score = recentUsage * 10;

  // Boost for increasing usage trend
  if (recentUsage > previousUsage) {
    const growthRate = previousUsage > 0 ? (recentUsage - previousUsage) / previousUsage : 1;
    score += growthRate * 20;
  }

  // Penalty for decreasing usage
  if (recentUsage < previousUsage && previousUsage > 0) {
    const declineRate = (previousUsage - recentUsage) / previousUsage;
    score -= declineRate * 15;
  }

  // Boost for overall popularity
  score += Math.log(totalUsage + 1) * 5;

  // Penalty for not being used recently
  if (daysSinceLastUse > 7) {
    score -= Math.min(daysSinceLastUse - 7, 30) * 2;
  }

  return Math.max(0, score);
}

/**
 * Determine if a song should be marked as trending
 */
export function shouldBeTrending(
  song: Song,
  recentUsage: number,
  previousUsage: number,
  threshold: number = 10
): boolean {
  const daysSinceLastUse = song.last_played_at 
    ? Math.floor((Date.now() - new Date(song.last_played_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const trendingScore = calculateTrendingScore(
    recentUsage,
    previousUsage,
    song.usage_count,
    daysSinceLastUse
  );

  return trendingScore >= threshold;
}

// =====================================================
// Usage Analytics Helpers
// =====================================================

/**
 * Calculate usage statistics for a collection of songs
 */
export function calculateUsageStats(songs: Song[]) {
  const totalSongs = songs.length;
  const totalUsage = songs.reduce((sum, song) => sum + (song.usage_count || 0), 0);
  const trendingSongs = songs.filter(song => song.is_trending).length;
  const unusedSongs = songs.filter(song => 
    !song.last_played_at || song.usage_count === 0
  ).length;

  const avgUsagePerSong = totalSongs > 0 ? totalUsage / totalSongs : 0;

  return {
    totalSongs,
    totalUsage,
    trendingSongs,
    unusedSongs,
    avgUsagePerSong,
    usageRate: totalSongs > 0 ? ((totalSongs - unusedSongs) / totalSongs) * 100 : 0,
  };
}

/**
 * Group songs by usage frequency
 */
export function groupSongsByUsage(songs: Song[]) {
  const groups = {
    heavy: [] as Song[], // 10+ uses
    moderate: [] as Song[], // 3-9 uses
    light: [] as Song[], // 1-2 uses
    unused: [] as Song[], // 0 uses
  };

  songs.forEach(song => {
    const usage = song.usage_count || 0;
    if (usage === 0) {
      groups.unused.push(song);
    } else if (usage >= 10) {
      groups.heavy.push(song);
    } else if (usage >= 3) {
      groups.moderate.push(song);
    } else {
      groups.light.push(song);
    }
  });

  return groups;
}

/**
 * Find songs that haven't been used in a specified number of days
 */
export function findUnusedSongs(songs: Song[], daysSinceLastUse: number = 90): Song[] {
  const cutoffDate = new Date(Date.now() - daysSinceLastUse * 24 * 60 * 60 * 1000);

  return songs.filter(song => {
    if (!song.last_played_at) return true;
    return new Date(song.last_played_at) < cutoffDate;
  });
}

/**
 * Get top songs by usage count
 */
export function getTopSongs(songs: Song[], limit: number = 10): Song[] {
  return [...songs]
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, limit);
}

/**
 * Get recently added songs
 */
export function getRecentlyAddedSongs(songs: Song[], days: number = 30): Song[] {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return songs
    .filter(song => new Date(song.created_at) >= cutoffDate)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// =====================================================
// Recommendation Helpers
// =====================================================

/**
 * Calculate recommendation score for a song based on context
 */
export function calculateRecommendationScore(
  song: Song,
  context: {
    serviceType?: ServiceType;
    currentSetlistKeys?: string[];
    currentSetlistBpms?: number[];
    recentUsage?: number;
    previousUsage?: number;
  } = {}
): number {
  let score = 0;

  // Base popularity score
  score += (song.usage_count || 0) * 2;

  // Trending bonus
  if (song.is_trending) {
    score += 15;
  }

  // Recency scoring
  if (song.last_played_at) {
    const daysSinceLastUse = Math.floor(
      (Date.now() - new Date(song.last_played_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastUse < 7) {
      score -= 5; // Don't repeat too soon
    } else if (daysSinceLastUse < 30) {
      score += 10; // Good recency
    } else if (daysSinceLastUse < 90) {
      score += 5; // Moderate recency
    } else {
      score -= 5; // Too old
    }
  } else {
    score -= 10; // Never used
  }

  // Key compatibility bonus
  if (context.currentSetlistKeys && context.currentSetlistKeys.length > 0 && song.key) {
    const hasCompatibleKey = context.currentSetlistKeys.some(key => 
      isCompatibleKey(key, song.key!)
    );
    if (hasCompatibleKey) {
      score += 8;
    }
  }

  // BPM flow bonus
  if (context.currentSetlistBpms && context.currentSetlistBpms.length > 0 && song.bpm) {
    const avgBpm = context.currentSetlistBpms.reduce((sum, bpm) => sum + bpm, 0) / context.currentSetlistBpms.length;
    const bpmDifference = Math.abs(avgBpm - song.bpm);
    
    if (bpmDifference <= 10) {
      score += 8; // Very close tempo
    } else if (bpmDifference <= 20) {
      score += 5; // Close tempo
    } else if (bpmDifference <= 40) {
      score += 2; // Moderate tempo difference
    } else {
      score -= 2; // Large tempo jump
    }
  }

  // Random factor for variety
  score += Math.random() * 5;

  return Math.max(0, score);
}

/**
 * Check if two keys are compatible (same key or related keys)
 */
export function isCompatibleKey(key1: string, key2: string): boolean {
  if (key1 === key2) return true;

  // Circle of fifths relationships
  const compatibleKeys: Record<string, string[]> = {
    'C': ['G', 'F', 'Am', 'Em', 'Dm'],
    'G': ['C', 'D', 'Em', 'Bm', 'Am'],
    'D': ['G', 'A', 'Bm', 'F#m', 'Em'],
    'A': ['D', 'E', 'F#m', 'C#m', 'Bm'],
    'E': ['A', 'B', 'C#m', 'G#m', 'F#m'],
    'B': ['E', 'F#', 'G#m', 'D#m', 'C#m'],
    'F#': ['B', 'C#', 'D#m', 'A#m', 'G#m'],
    'F': ['C', 'Bb', 'Dm', 'Am', 'Gm'],
    'Bb': ['F', 'Eb', 'Gm', 'Dm', 'Cm'],
    'Eb': ['Bb', 'Ab', 'Cm', 'Gm', 'Fm'],
    'Ab': ['Eb', 'Db', 'Fm', 'Cm', 'Bbm'],
    'Db': ['Ab', 'Gb', 'Bbm', 'Fm', 'Ebm'],
  };

  return compatibleKeys[key1]?.includes(key2) || compatibleKeys[key2]?.includes(key1) || false;
}

/**
 * Generate recommendation reason text
 */
export function getRecommendationReason(
  song: Song,
  score: number,
  context: {
    serviceType?: ServiceType;
    hasCompatibleKey?: boolean;
    hasCompatibleBpm?: boolean;
  } = {}
): string {
  if (song.is_trending) {
    return 'Trending song';
  }

  if (song.usage_count > 10) {
    return 'Popular choice';
  }

  if (context.hasCompatibleKey && context.hasCompatibleBpm) {
    return 'Great fit for setlist';
  }

  if (context.hasCompatibleKey) {
    return 'Compatible key';
  }

  if (context.hasCompatibleBpm) {
    return 'Good tempo flow';
  }

  if (song.last_played_at) {
    const daysSinceLastUse = Math.floor(
      (Date.now() - new Date(song.last_played_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastUse < 30) {
      return 'Recently used';
    } else if (daysSinceLastUse > 90) {
      return 'Haven\'t used recently';
    }
  } else {
    return 'Never used before';
  }

  return 'Good fit for service';
}

// =====================================================
// Date and Time Helpers
// =====================================================

/**
 * Format a date for display in usage analytics
 */
export function formatUsageDate(dateString: string | undefined): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}

/**
 * Get the start of a period (week, month, year) for analytics
 */
export function getPeriodStart(period: 'week' | 'month' | 'year', date: Date = new Date()): Date {
  const result = new Date(date);
  
  switch (period) {
    case 'week':
      result.setDate(result.getDate() - result.getDay());
      break;
    case 'month':
      result.setDate(1);
      break;
    case 'year':
      result.setMonth(0, 1);
      break;
  }
  
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Generate date ranges for analytics reports
 */
export function generateDateRanges(
  period: 'week' | 'month' | 'year',
  count: number = 12
): Array<{ start: Date; end: Date; label: string }> {
  const ranges: Array<{ start: Date; end: Date; label: string }> = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    let start: Date;
    let end: Date;
    let label: string;

    if (period === 'week') {
      start = new Date(now);
      start.setDate(start.getDate() - (start.getDay() + (i * 7)));
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      label = `Week of ${start.toLocaleDateString()}`;
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      label = start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    } else {
      start = new Date(now.getFullYear() - i, 0, 1);
      end = new Date(now.getFullYear() - i, 11, 31, 23, 59, 59, 999);
      label = start.getFullYear().toString();
    }

    ranges.push({ start, end, label });
  }

  return ranges.reverse(); // Return in chronological order
}

export default {
  createUsageRequest,
  createBulkUsageRequests,
  calculateTrendingScore,
  shouldBeTrending,
  calculateUsageStats,
  groupSongsByUsage,
  findUnusedSongs,
  getTopSongs,
  getRecentlyAddedSongs,
  calculateRecommendationScore,
  isCompatibleKey,
  getRecommendationReason,
  formatUsageDate,
  getPeriodStart,
  generateDateRanges,
};