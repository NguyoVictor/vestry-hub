/**
 * OPTIMIZED DASHBOARD HOOK
 * 
 * Replaces multiple individual queries with single RPC calls for better performance
 * Based on Martin Kleppmann's principles for reducing query overhead
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { queryMonitor } from "@/lib/queryOptimization";
import { useEffect } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  members: {
    total: number;
    active: number;
    growth_rate: number;
  };
  events: {
    total: number;
    upcoming: number;
  };
  giving: {
    total: number;
    monthly: number;
    currency: string;
  };
  services: {
    total: number;
  };
  activity: {
    recent_count: number;
  };
  generated_at: number;
}

export interface MemberAnalytics {
  growth: Array<{
    month: string;
    new_members: number;
  }>;
  demographics: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  engagement: Array<{
    level: string;
    count: number;
  }>;
  generated_at: number;
}

export interface FinancialAnalytics {
  trends: Array<{
    month: string;
    amount: number;
    transactions: number;
    donors: number;
  }>;
  by_type: Array<{
    type: string;
    amount: number;
    transactions: number;
    percentage: number;
  }>;
  top_donors: Array<{
    donor: string;
    amount: number;
    transactions: number;
  }>;
  generated_at: number;
}

export interface ActivityFeed {
  data: Array<{
    id: string;
    action_type: string;
    description: string;
    actor_name: string;
    actor_avatar_url?: string;
    entity_type: string;
    entity_name: string;
    created_at: string;
    metadata: Record<string, any>;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  generated_at: number;
}

// ─── OPTIMIZED DASHBOARD STATS HOOK ──────────────────────────────────────────

export function useOptimizedDashboardStats() {
  const { church } = useChurch();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["dashboard-stats-optimized", church?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!church?.id) {
        throw new Error("Church context is required");
      }

      return queryMonitor.measureQuery(
        "getDashboardStats",
        async () => {
          const { data, error } = await supabase.rpc('get_dashboard_stats_optimized', {
            p_tenant_id: church.id
          });

          if (error) {
            console.error('Dashboard stats RPC error:', error);
            throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
          }

          return data as DashboardStats;
        }
      );
    },
    enabled: !!church?.id,
    staleTime: 300_000, // 5 minutes - dashboard stats can be slightly stale
    gcTime: 600_000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error?.message?.includes('400') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Auto-refresh every 5 minutes when tab is active
  useEffect(() => {
    if (!church?.id) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({
          queryKey: ["dashboard-stats-optimized", church.id]
        });
      }
    }, 300_000); // 5 minutes

    return () => clearInterval(interval);
  }, [church?.id, queryClient]);

  return query;
}

// ─── OPTIMIZED MEMBER ANALYTICS HOOK ─────────────────────────────────────────

export function useOptimizedMemberAnalytics() {
  const { church } = useChurch();

  return useQuery({
    queryKey: ["member-analytics-optimized", church?.id],
    queryFn: async (): Promise<MemberAnalytics> => {
      if (!church?.id) {
        throw new Error("Church context is required");
      }

      return queryMonitor.measureQuery(
        "getMemberAnalytics",
        async () => {
          const { data, error } = await supabase.rpc('get_member_analytics_optimized', {
            p_tenant_id: church.id
          });

          if (error) {
            console.error('Member analytics RPC error:', error);
            throw new Error(`Failed to fetch member analytics: ${error.message}`);
          }

          return data as MemberAnalytics;
        }
      );
    },
    enabled: !!church?.id,
    staleTime: 600_000, // 10 minutes - analytics can be more stale
    gcTime: 1800_000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

// ─── OPTIMIZED FINANCIAL ANALYTICS HOOK ──────────────────────────────────────

export function useOptimizedFinancialAnalytics() {
  const { church } = useChurch();

  return useQuery({
    queryKey: ["financial-analytics-optimized", church?.id],
    queryFn: async (): Promise<FinancialAnalytics> => {
      if (!church?.id) {
        throw new Error("Church context is required");
      }

      return queryMonitor.measureQuery(
        "getFinancialAnalytics",
        async () => {
          const { data, error } = await supabase.rpc('get_financial_analytics_optimized', {
            p_tenant_id: church.id
          });

          if (error) {
            console.error('Financial analytics RPC error:', error);
            throw new Error(`Failed to fetch financial analytics: ${error.message}`);
          }

          return data as FinancialAnalytics;
        }
      );
    },
    enabled: !!church?.id,
    staleTime: 600_000, // 10 minutes
    gcTime: 1800_000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

// ─── OPTIMIZED ACTIVITY FEED HOOK ────────────────────────────────────────────

export function useOptimizedActivityFeed(
  limit: number = 20,
  offset: number = 0
) {
  const { church } = useChurch();

  return useQuery({
    queryKey: ["activity-feed-optimized", church?.id, limit, offset],
    queryFn: async (): Promise<ActivityFeed> => {
      if (!church?.id) {
        throw new Error("Church context is required");
      }

      return queryMonitor.measureQuery(
        "getActivityFeed",
        async () => {
          const { data, error } = await supabase.rpc('get_activity_feed_optimized', {
            p_tenant_id: church.id,
            p_limit: limit,
            p_offset: offset
          });

          if (error) {
            console.error('Activity feed RPC error:', error);
            throw new Error(`Failed to fetch activity feed: ${error.message}`);
          }

          return data as ActivityFeed;
        }
      );
    },
    enabled: !!church?.id,
    staleTime: 30_000, // 30 seconds - activity should be fresh
    gcTime: 300_000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ─── PERFORMANCE METRICS HOOK ────────────────────────────────────────────────

export function usePerformanceMetrics() {
  const { church } = useChurch();

  return useQuery({
    queryKey: ["performance-metrics", church?.id],
    queryFn: async () => {
      if (!church?.id) {
        throw new Error("Church context is required");
      }

      const { data, error } = await supabase.rpc('get_performance_metrics_optimized', {
        p_tenant_id: church.id
      });

      if (error) {
        console.error('Performance metrics RPC error:', error);
        throw new Error(`Failed to fetch performance metrics: ${error.message}`);
      }

      return data;
    },
    enabled: !!church?.id,
    staleTime: 300_000, // 5 minutes
    gcTime: 600_000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ─── COMBINED DASHBOARD HOOK ─────────────────────────────────────────────────

export function useOptimizedDashboard() {
  const stats = useOptimizedDashboardStats();
  const memberAnalytics = useOptimizedMemberAnalytics();
  const financialAnalytics = useOptimizedFinancialAnalytics();
  const activityFeed = useOptimizedActivityFeed(10, 0); // First 10 activities
  const performanceMetrics = usePerformanceMetrics();

  return {
    stats,
    memberAnalytics,
    financialAnalytics,
    activityFeed,
    performanceMetrics,
    
    // Combined loading state
    isLoading: stats.isLoading || memberAnalytics.isLoading || financialAnalytics.isLoading,
    
    // Combined error state
    error: stats.error || memberAnalytics.error || financialAnalytics.error,
    
    // Refresh all dashboard data
    refetchAll: () => {
      stats.refetch();
      memberAnalytics.refetch();
      financialAnalytics.refetch();
      activityFeed.refetch();
      performanceMetrics.refetch();
    }
  };
}

// ─── QUERY PERFORMANCE MONITORING ────────────────────────────────────────────

export function useQueryPerformanceMonitor() {
  return useQuery({
    queryKey: ["query-performance-monitor"],
    queryFn: () => {
      const metrics = queryMonitor.getMetrics();
      
      // Log slow queries for debugging
      Object.entries(metrics).forEach(([queryName, metric]) => {
        if (metric.avgTime > 1000) { // Queries taking more than 1 second
          console.warn(`Slow query detected: ${queryName} - Average: ${metric.avgTime.toFixed(2)}ms`);
        }
      });
      
      return metrics;
    },
    enabled: process.env.NODE_ENV === 'development', // Only in development
    staleTime: 10_000, // 10 seconds
    refetchInterval: 30_000, // Refresh every 30 seconds
  });
}