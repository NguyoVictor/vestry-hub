/**
 * PRODUCTION CACHE MANAGER
 * 
 * Stateless caching system for production scalability
 * Based on Martin Kleppmann's principles for cache consistency and performance
 */

import { supabase } from "@/integrations/supabase/client";

// ─── CACHE CONFIGURATION ─────────────────────────────────────────────────────

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
}

const CACHE_CONFIG: CacheConfig = {
  defaultTTL: 300_000, // 5 minutes
  maxSize: 1000, // Max cache entries
  cleanupInterval: 60_000, // Cleanup every minute
};

// ─── CACHE ENTRY INTERFACE ───────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tenantId: string;
}

// ─── PRODUCTION CACHE MANAGER ────────────────────────────────────────────────

export class ProductionCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private hitStats = new Map<string, { hits: number; misses: number }>();

  constructor() {
    this.startCleanupTimer();
    
    // Clear cache on page unload to prevent memory leaks
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clear();
      });
    }
  }

  /**
   * Generate cache key with tenant isolation
   */
  private generateKey(tenantId: string, table: string, params: any): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${tenantId}:${table}:${btoa(paramString)}`;
  }

  /**
   * Get cached data with tenant isolation
   */
  get<T>(tenantId: string, table: string, params: any): T | null {
    const key = this.generateKey(tenantId, table, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordMiss(key);
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.recordMiss(key);
      return null;
    }

    // Verify tenant isolation
    if (entry.tenantId !== tenantId) {
      console.error(`Cache security violation: tenant mismatch for key ${key}`);
      this.cache.delete(key);
      return null;
    }

    // Update hit count and record hit
    entry.hits++;
    this.recordHit(key);
    
    return entry.data as T;
  }

  /**
   * Set cached data with tenant isolation
   */
  set<T>(
    tenantId: string, 
    table: string, 
    params: any, 
    data: T, 
    ttl: number = CACHE_CONFIG.defaultTTL
  ): void {
    const key = this.generateKey(tenantId, table, params);

    // Enforce cache size limit
    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      tenantId
    });
  }

  /**
   * Invalidate cache entries for a specific tenant and table
   */
  invalidate(tenantId: string, table?: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tenantId === tenantId) {
        if (!table || key.includes(`:${table}:`)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    console.log(`Cache invalidated: ${keysToDelete.length} entries for tenant ${tenantId}${table ? ` table ${table}` : ''}`);
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < leastHits) {
        leastHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * Record cache hit for statistics
   */
  private recordHit(key: string): void {
    const stats = this.hitStats.get(key) || { hits: 0, misses: 0 };
    stats.hits++;
    this.hitStats.set(key, stats);
  }

  /**
   * Record cache miss for statistics
   */
  private recordMiss(key: string): void {
    const stats = this.hitStats.get(key) || { hits: 0, misses: 0 };
    stats.misses++;
    this.hitStats.set(key, stats);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    topKeys: Array<{ key: string; hits: number; hitRate: number }>;
  } {
    let totalHits = 0;
    let totalMisses = 0;
    const keyStats: Array<{ key: string; hits: number; misses: number; hitRate: number }> = [];

    for (const [key, stats] of this.hitStats.entries()) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
      
      const total = stats.hits + stats.misses;
      keyStats.push({
        key: key.split(':')[1] || key, // Show table name only
        hits: stats.hits,
        misses: stats.misses,
        hitRate: total > 0 ? (stats.hits / total) * 100 : 0
      });
    }

    const overallHitRate = (totalHits + totalMisses) > 0 
      ? (totalHits / (totalHits + totalMisses)) * 100 
      : 0;

    return {
      size: this.cache.size,
      hitRate: overallHitRate,
      topKeys: keyStats
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10)
    };
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hitStats.clear();
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// ─── QUERY RESULT CACHE ──────────────────────────────────────────────────────

export class QueryResultCache {
  private cacheManager: ProductionCacheManager;

  constructor(cacheManager: ProductionCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Cache query result with automatic invalidation
   */
  async cacheQuery<T>(
    tenantId: string,
    table: string,
    queryFn: () => Promise<T>,
    params: any = {},
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.cacheManager.get<T>(tenantId, table, params);
    if (cached !== null) {
      return cached;
    }

    // Execute query and cache result
    const result = await queryFn();
    this.cacheManager.set(tenantId, table, params, result, ttl);
    
    return result;
  }

  /**
   * Invalidate cache for specific table
   */
  invalidateTable(tenantId: string, table: string): void {
    this.cacheManager.invalidate(tenantId, table);
  }

  /**
   * Invalidate all cache for tenant
   */
  invalidateTenant(tenantId: string): void {
    this.cacheManager.invalidate(tenantId);
  }
}

// ─── CONNECTION POOL MANAGER ─────────────────────────────────────────────────

export class ConnectionPoolManager {
  private activeConnections = new Map<string, number>();
  private maxConnectionsPerTenant = 10;
  private connectionTimeout = 30_000; // 30 seconds

  /**
   * Track active connection for tenant
   */
  trackConnection(tenantId: string): void {
    const current = this.activeConnections.get(tenantId) || 0;
    this.activeConnections.set(tenantId, current + 1);

    // Log warning if approaching limit
    if (current >= this.maxConnectionsPerTenant * 0.8) {
      console.warn(`High connection count for tenant ${tenantId}: ${current}`);
    }
  }

  /**
   * Release connection for tenant
   */
  releaseConnection(tenantId: string): void {
    const current = this.activeConnections.get(tenantId) || 0;
    if (current > 0) {
      this.activeConnections.set(tenantId, current - 1);
    }
  }

  /**
   * Check if tenant can create new connection
   */
  canCreateConnection(tenantId: string): boolean {
    const current = this.activeConnections.get(tenantId) || 0;
    return current < this.maxConnectionsPerTenant;
  }

  /**
   * Get connection statistics
   */
  getStats(): Record<string, number> {
    return Object.fromEntries(this.activeConnections);
  }
}

// ─── REALTIME SUBSCRIPTION MANAGER ───────────────────────────────────────────

export class RealtimeSubscriptionManager {
  private subscriptions = new Map<string, any>();
  private cacheManager: ProductionCacheManager;

  constructor(cacheManager: ProductionCacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * Create optimized realtime subscription with cache invalidation
   */
  subscribe(
    tenantId: string,
    table: string,
    callback: (payload: any) => void,
    options: {
      events?: string[];
      filter?: string;
    } = {}
  ): () => void {
    const { events = ['INSERT', 'UPDATE', 'DELETE'], filter } = options;
    const subscriptionKey = `${tenantId}:${table}:${filter || 'all'}`;

    // Prevent duplicate subscriptions
    if (this.subscriptions.has(subscriptionKey)) {
      console.warn(`Duplicate subscription prevented for ${subscriptionKey}`);
      return this.subscriptions.get(subscriptionKey).unsubscribe;
    }

    const channel = supabase
      .channel(`optimized:${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter || `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          // Invalidate cache on data changes
          this.cacheManager.invalidate(tenantId, table);
          
          // Call user callback
          callback(payload);
          
          console.log(`Realtime update: ${table} for tenant ${tenantId}`);
        }
      )
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionKey);
      console.log(`Unsubscribed from ${subscriptionKey}`);
    };

    this.subscriptions.set(subscriptionKey, { channel, unsubscribe });
    console.log(`Subscribed to ${subscriptionKey}`);
    
    return unsubscribe;
  }

  /**
   * Clean up all subscriptions (prevent memory leaks)
   */
  cleanup(): void {
    console.log(`Cleaning up ${this.subscriptions.size} realtime subscriptions`);
    
    this.subscriptions.forEach(({ channel }) => {
      supabase.removeChannel(channel);
    });
    
    this.subscriptions.clear();
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    activeSubscriptions: number;
    subscriptionsByTenant: Record<string, number>;
  } {
    const subscriptionsByTenant: Record<string, number> = {};
    
    for (const key of this.subscriptions.keys()) {
      const tenantId = key.split(':')[0];
      subscriptionsByTenant[tenantId] = (subscriptionsByTenant[tenantId] || 0) + 1;
    }

    return {
      activeSubscriptions: this.subscriptions.size,
      subscriptionsByTenant
    };
  }
}

// ─── GLOBAL INSTANCES ────────────────────────────────────────────────────────

export const productionCacheManager = new ProductionCacheManager();
export const queryResultCache = new QueryResultCache(productionCacheManager);
export const connectionPoolManager = new ConnectionPoolManager();
export const realtimeSubscriptionManager = new RealtimeSubscriptionManager(productionCacheManager);

// ─── CACHE HOOKS FOR REACT ───────────────────────────────────────────────────

export function useCacheStats() {
  const [stats, setStats] = React.useState(productionCacheManager.getStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(productionCacheManager.getStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return stats;
}

// ─── PERFORMANCE MONITORING ──────────────────────────────────────────────────

export class CachePerformanceMonitor {
  private metrics = {
    queries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgQueryTime: 0,
    totalQueryTime: 0
  };

  recordQuery(duration: number, wasHit: boolean): void {
    this.metrics.queries++;
    this.metrics.totalQueryTime += duration;
    this.metrics.avgQueryTime = this.metrics.totalQueryTime / this.metrics.queries;

    if (wasHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      hitRate: this.metrics.queries > 0 
        ? (this.metrics.cacheHits / this.metrics.queries) * 100 
        : 0
    };
  }

  reset(): void {
    this.metrics = {
      queries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgQueryTime: 0,
      totalQueryTime: 0
    };
  }
}

export const cachePerformanceMonitor = new CachePerformanceMonitor();

// Add React import for hooks
import React from 'react';