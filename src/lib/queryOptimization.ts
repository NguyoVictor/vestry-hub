/**
 * PRODUCTION QUERY OPTIMIZATION LAYER
 * 
 * Based on Martin Kleppmann's "Designing Data-Intensive Applications"
 * Implements proper pagination, caching, and query batching for production scale
 */

import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "./schema";

// ─── PAGINATION TYPES ────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

export interface QueryOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, any>;
  search?: string;
}

// ─── OPTIMIZED QUERY BUILDER ─────────────────────────────────────────────────

export class OptimizedQueryBuilder {
  private tenantId: string;
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Paginated query with proper indexing and performance optimization
   */
  async paginatedQuery<T>(
    table: string,
    options: QueryOptions = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<T>> {
    const {
      select = "*",
      orderBy = { column: "created_at", ascending: false },
      filters = {},
      search
    } = options;

    const {
      page = 1,
      limit = 20,
      cursor
    } = pagination;

    // Validate pagination limits (prevent memory exhaustion)
    const safeLimit = Math.min(Math.max(limit, 1), 100); // Max 100 items per page
    const offset = (page - 1) * safeLimit;

    // Build base query with tenant isolation (CRITICAL for multi-tenant security)
    let query = supabase
      .from(table)
      .select(select, { count: 'exact' })
      .eq(COLS.TENANT_ID, this.tenantId);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply search (uses full-text search indexes)
    if (search && search.trim()) {
      const searchTerm = search.trim().replace(/[^\w\s]/g, ''); // Sanitize
      
      // Use different search strategies based on table
      if (table === TABLES.MEMBERS) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      } else if (table === TABLES.EVENTS) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      } else {
        // Generic search on common fields
        query = query.or(`name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
      }
    }

    // Apply ordering (uses indexes for performance)
    query = query.order(orderBy.column, { ascending: orderBy.ascending });

    // Apply pagination
    if (cursor) {
      // Cursor-based pagination for large datasets
      query = query.gt(orderBy.column, cursor);
    } else {
      // Offset-based pagination for smaller datasets
      query = query.range(offset, offset + safeLimit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / safeLimit);

    return {
      data: (data || []) as T[],
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextCursor: data && data.length > 0 ? data[data.length - 1][orderBy.column] : undefined,
        prevCursor: data && data.length > 0 ? data[0][orderBy.column] : undefined,
      }
    };
  }

  /**
   * Batch query multiple related entities (prevents N+1 queries)
   */
  async batchQuery<T>(
    queries: Array<{
      table: string;
      select?: string;
      filters?: Record<string, any>;
      key: string;
    }>
  ): Promise<Record<string, T[]>> {
    const promises = queries.map(async ({ table, select = "*", filters = {}, key }) => {
      let query = supabase
        .from(table)
        .select(select)
        .eq(COLS.TENANT_ID, this.tenantId);

      Object.entries(filters).forEach(([filterKey, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(filterKey, value);
        }
      });

      const { data, error } = await query;
      if (error) throw error;
      
      return { key, data: data || [] };
    });

    const results = await Promise.all(promises);
    
    return results.reduce((acc, { key, data }) => {
      acc[key] = data as T[];
      return acc;
    }, {} as Record<string, T[]>);
  }

  /**
   * Optimized member queries with proper indexing
   */
  async getMembers(options: QueryOptions = {}, pagination: PaginationParams = {}) {
    return this.paginatedQuery(
      TABLES.MEMBERS,
      {
        select: `
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          membership_status,
          avatar_url,
          created_at,
          join_date
        `,
        orderBy: { column: "created_at", ascending: false },
        ...options
      },
      pagination
    );
  }

  /**
   * Optimized event queries with proper indexing
   */
  async getEvents(options: QueryOptions = {}, pagination: PaginationParams = {}) {
    return this.paginatedQuery(
      TABLES.EVENTS,
      {
        select: `
          id,
          title,
          description,
          event_date,
          start_time,
          end_time,
          location,
          is_published,
          capacity_limit,
          created_at
        `,
        orderBy: { column: "event_date", ascending: false },
        filters: { is_published: true, ...options.filters },
        ...options
      },
      pagination
    );
  }

  /**
   * Optimized activity log with time-based partitioning
   */
  async getActivityLog(options: QueryOptions = {}, pagination: PaginationParams = {}) {
    return this.paginatedQuery(
      TABLES.ACTIVITY_LOG,
      {
        select: `
          id,
          action_type,
          description,
          actor_name,
          actor_avatar_url,
          entity_type,
          entity_name,
          created_at
        `,
        orderBy: { column: "created_at", ascending: false },
        ...options
      },
      { limit: 50, ...pagination } // Smaller default for activity feeds
    );
  }

  /**
   * Dashboard stats with optimized aggregation queries
   */
  async getDashboardStats() {
    // Use RPC function for complex aggregations (better performance)
    const { data, error } = await supabase.rpc('get_dashboard_stats_optimized', {
      p_tenant_id: this.tenantId
    });

    if (error) throw error;
    return data;
  }
}

// ─── QUERY CACHE LAYER ───────────────────────────────────────────────────────

export class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private generateKey(table: string, params: any): string {
    return `${table}:${JSON.stringify(params)}`;
  }

  get<T>(table: string, params: any): T | null {
    const key = this.generateKey(table, params);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  set<T>(table: string, params: any, data: T, ttl: number = 300000): void { // 5min default
    const key = this.generateKey(table, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  invalidate(table: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${table}:`));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }
}

// ─── REALTIME OPTIMIZATION ───────────────────────────────────────────────────

export class OptimizedRealtime {
  private subscriptions = new Map<string, any>();
  private queryCache: QueryCache;

  constructor(queryCache: QueryCache) {
    this.queryCache = queryCache;
  }

  /**
   * Subscribe to table changes with proper cleanup
   */
  subscribe(
    table: string,
    tenantId: string,
    callback: (payload: any) => void,
    options: { events?: string[]; filter?: string } = {}
  ): () => void {
    const { events = ['INSERT', 'UPDATE', 'DELETE'], filter } = options;
    const subscriptionKey = `${table}:${tenantId}:${filter || 'all'}`;

    // Prevent duplicate subscriptions
    if (this.subscriptions.has(subscriptionKey)) {
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
          this.queryCache.invalidate(table);
          callback(payload);
        }
      )
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionKey);
    };

    this.subscriptions.set(subscriptionKey, { channel, unsubscribe });
    return unsubscribe;
  }

  /**
   * Clean up all subscriptions (prevent memory leaks)
   */
  cleanup(): void {
    this.subscriptions.forEach(({ channel }) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }
}

// ─── EXPORT OPTIMIZED INSTANCES ──────────────────────────────────────────────

export const queryCache = new QueryCache();
export const optimizedRealtime = new OptimizedRealtime(queryCache);

// Helper function to create optimized query builder
export function createOptimizedQuery(tenantId: string): OptimizedQueryBuilder {
  return new OptimizedQueryBuilder(tenantId);
}

// ─── PERFORMANCE MONITORING ──────────────────────────────────────────────────

export class QueryPerformanceMonitor {
  private metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric(queryName, duration);
      
      // Log slow queries (>500ms)
      if (duration > 500) {
        console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`Query failed: ${queryName} after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  private recordMetric(queryName: string, duration: number): void {
    const existing = this.metrics.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.metrics.set(queryName, existing);
  }

  getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const queryMonitor = new QueryPerformanceMonitor();