/**
 * Caching utilities for Song Library performance optimization
 * Validates: Requirements 11.3 (browser storage caching for frequently accessed songs)
 */

import { Song } from '../types';

// Cache configuration
const CACHE_CONFIG = {
  SONGS: {
    key: 'vestry_song_cache',
    maxSize: 100, // Maximum number of songs to cache
    ttl: 1000 * 60 * 30, // 30 minutes TTL
  },
  COVER_ART: {
    key: 'vestry_cover_art_cache',
    maxSize: 50,
    ttl: 1000 * 60 * 60 * 24, // 24 hours TTL
  },
  SEARCH_RESULTS: {
    key: 'vestry_search_cache',
    maxSize: 20,
    ttl: 1000 * 60 * 10, // 10 minutes TTL
  },
  USER_PREFERENCES: {
    key: 'vestry_user_preferences',
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days TTL
  },
} as const;

interface CacheItem<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

/**
 * Generic cache implementation with LRU eviction and TTL support
 */
class Cache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private stats: CacheStats;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.stats = { hits: 0, misses: 0, size: 0, maxSize };
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.size--;
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    return item.data;
  }

  set(key: string, data: T): void {
    const now = Date.now();
    
    // If cache is full, evict least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
    };

    const wasNew = !this.cache.has(key);
    this.cache.set(key, item);
    
    if (wasNew) {
      this.stats.size++;
    }
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size--;
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.size--;
    }
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.stats.size--;
    });
  }
}

/**
 * Persistent cache using localStorage with fallback to memory
 */
class PersistentCache<T> extends Cache<T> {
  private storageKey: string;

  constructor(storageKey: string, maxSize: number, ttl: number) {
    super(maxSize, ttl);
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  set(key: string, data: T): void {
    super.set(key, data);
    this.saveToStorage();
  }

  delete(key: string): boolean {
    const result = super.delete(key);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  clear(): void {
    super.clear();
    this.clearStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Restore cache items, checking TTL
        const now = Date.now();
        for (const [key, item] of Object.entries(data)) {
          const cacheItem = item as CacheItem<T>;
          if (now - cacheItem.timestamp <= this.ttl) {
            this.set(key, cacheItem.data);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const cacheData: Record<string, CacheItem<T>> = {};
      for (const [key, item] of (this as any).cache.entries()) {
        cacheData[key] = item;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear cache storage:', error);
    }
  }
}

// Cache instances
export const songCache = new PersistentCache<Song>(
  CACHE_CONFIG.SONGS.key,
  CACHE_CONFIG.SONGS.maxSize,
  CACHE_CONFIG.SONGS.ttl
);

export const coverArtCache = new Cache<string>(
  CACHE_CONFIG.COVER_ART.maxSize,
  CACHE_CONFIG.COVER_ART.ttl
);

export const searchCache = new Cache<any>(
  CACHE_CONFIG.SEARCH_RESULTS.maxSize,
  CACHE_CONFIG.SEARCH_RESULTS.ttl
);

export const preferencesCache = new PersistentCache<any>(
  CACHE_CONFIG.USER_PREFERENCES.key,
  1, // Only one preferences object
  CACHE_CONFIG.USER_PREFERENCES.ttl
);

/**
 * Cache invalidation utilities
 */
export const cacheInvalidation = {
  // Invalidate song cache when songs are modified
  invalidateSong: (songId: string) => {
    songCache.delete(songId);
  },

  // Invalidate all song caches
  invalidateAllSongs: () => {
    songCache.clear();
  },

  // Invalidate search cache when songs change
  invalidateSearch: () => {
    searchCache.clear();
  },

  // Invalidate cover art cache
  invalidateCoverArt: (songId: string) => {
    coverArtCache.delete(songId);
  },

  // Clean up expired items across all caches
  cleanupAll: () => {
    songCache.cleanup();
    coverArtCache.cleanup();
    searchCache.cleanup();
  },
};

/**
 * Preloading utilities for critical UI components
 */
export const preloader = {
  // Preload frequently accessed songs
  preloadPopularSongs: async (songIds: string[], fetchFn: (id: string) => Promise<Song>) => {
    const promises = songIds.map(async (id) => {
      if (!songCache.get(id)) {
        try {
          const song = await fetchFn(id);
          songCache.set(id, song);
        } catch (error) {
          console.warn(`Failed to preload song ${id}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  },

  // Preload cover art images
  preloadCoverArt: async (imageUrls: string[]) => {
    const promises = imageUrls.map(async (url) => {
      if (!coverArtCache.get(url)) {
        try {
          // Create image element to trigger browser caching
          const img = new Image();
          img.src = url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          coverArtCache.set(url, url);
        } catch (error) {
          console.warn(`Failed to preload cover art ${url}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  },

  // Preload critical UI components
  preloadComponents: async () => {
    try {
      // Dynamically import heavy components to trigger loading
      await Promise.all([
        import('../components/ChordTransposition'),
        import('../components/SetlistBuilder'),
        import('../components/CommandPalette'),
      ]);
    } catch (error) {
      console.warn('Failed to preload components:', error);
    }
  },
};

/**
 * Cache monitoring and analytics
 */
export const cacheMonitor = {
  getStats: () => ({
    songs: songCache.getStats(),
    coverArt: coverArtCache.getStats(),
    search: searchCache.getStats(),
  }),

  getHitRatio: () => {
    const stats = cacheMonitor.getStats();
    const totalHits = stats.songs.hits + stats.coverArt.hits + stats.search.hits;
    const totalRequests = totalHits + stats.songs.misses + stats.coverArt.misses + stats.search.misses;
    
    return totalRequests > 0 ? totalHits / totalRequests : 0;
  },

  logStats: () => {
    const stats = cacheMonitor.getStats();
    const hitRatio = cacheMonitor.getHitRatio();
    
    console.group('Song Library Cache Stats');
    console.log('Hit Ratio:', `${(hitRatio * 100).toFixed(1)}%`);
    console.log('Songs Cache:', stats.songs);
    console.log('Cover Art Cache:', stats.coverArt);
    console.log('Search Cache:', stats.search);
    console.groupEnd();
  },
};

// Automatic cleanup interval (every 5 minutes)
setInterval(() => {
  cacheInvalidation.cleanupAll();
}, 5 * 60 * 1000);