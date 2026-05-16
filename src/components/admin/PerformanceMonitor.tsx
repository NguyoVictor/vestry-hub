/**
 * PRODUCTION PERFORMANCE MONITORING DASHBOARD
 * 
 * Real-time monitoring of database performance, cache efficiency, and query optimization
 * Based on Martin Kleppmann's principles for observability in data-intensive applications
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Gauge
} from 'lucide-react';
import { 
  productionCacheManager, 
  connectionPoolManager, 
  realtimeSubscriptionManager,
  cachePerformanceMonitor 
} from '@/lib/cacheManager';
import { queryMonitor } from '@/lib/queryOptimization';
import { usePerformanceMetrics } from '@/hooks/useOptimizedDashboard';
import { motion } from 'framer-motion';

// ─── PERFORMANCE METRICS COMPONENT ───────────────────────────────────────────

export function PerformanceMonitor() {
  const [cacheStats, setCacheStats] = useState(productionCacheManager.getStats());
  const [queryStats, setQueryStats] = useState(queryMonitor.getMetrics());
  const [connectionStats, setConnectionStats] = useState(connectionPoolManager.getStats());
  const [realtimeStats, setRealtimeStats] = useState(realtimeSubscriptionManager.getStats());
  const [cachePerformance, setCachePerformance] = useState(cachePerformanceMonitor.getMetrics());
  
  const { data: dbMetrics, isLoading: dbLoading } = usePerformanceMetrics();

  // Update stats every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(productionCacheManager.getStats());
      setQueryStats(queryMonitor.getMetrics());
      setConnectionStats(connectionPoolManager.getStats());
      setRealtimeStats(realtimeSubscriptionManager.getStats());
      setCachePerformance(cachePerformanceMonitor.getMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    productionCacheManager.clear();
    setCacheStats(productionCacheManager.getStats());
  };

  const handleResetMetrics = () => {
    queryMonitor.reset();
    cachePerformanceMonitor.reset();
    setQueryStats({});
    setCachePerformance(cachePerformanceMonitor.getMetrics());
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Performance Monitor</h1>
          <p className="text-slate-500 mt-1">Real-time system performance and optimization metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetMetrics}>
            Reset Metrics
          </Button>
          <Button variant="outline" onClick={handleClearCache}>
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerformanceCard
          title="Cache Hit Rate"
          value={`${cachePerformance.hitRate.toFixed(1)}%`}
          icon={<Zap className="h-5 w-5" />}
          status={cachePerformance.hitRate > 80 ? 'good' : cachePerformance.hitRate > 60 ? 'warning' : 'error'}
          description="Cache efficiency"
        />
        
        <PerformanceCard
          title="Avg Query Time"
          value={`${cachePerformance.avgQueryTime.toFixed(0)}ms`}
          icon={<Clock className="h-5 w-5" />}
          status={cachePerformance.avgQueryTime < 100 ? 'good' : cachePerformance.avgQueryTime < 500 ? 'warning' : 'error'}
          description="Average response time"
        />
        
        <PerformanceCard
          title="Active Connections"
          value={Object.values(connectionStats).reduce((a, b) => a + b, 0).toString()}
          icon={<Database className="h-5 w-5" />}
          status="good"
          description="Database connections"
        />
        
        <PerformanceCard
          title="Realtime Subs"
          value={realtimeStats.activeSubscriptions.toString()}
          icon={<Activity className="h-5 w-5" />}
          status={realtimeStats.activeSubscriptions < 50 ? 'good' : 'warning'}
          description="Active subscriptions"
        />
      </div>

      <Tabs defaultValue="cache" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="queries">Query Analysis</TabsTrigger>
          <TabsTrigger value="database">Database Metrics</TabsTrigger>
          <TabsTrigger value="realtime">Realtime Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="cache" className="space-y-4">
          <CachePerformanceTab 
            cacheStats={cacheStats} 
            cachePerformance={cachePerformance} 
          />
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <QueryAnalysisTab queryStats={queryStats} />
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <DatabaseMetricsTab 
            dbMetrics={dbMetrics} 
            isLoading={dbLoading}
            connectionStats={connectionStats}
          />
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <RealtimeStatsTab realtimeStats={realtimeStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── PERFORMANCE CARD COMPONENT ──────────────────────────────────────────────

interface PerformanceCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  status: 'good' | 'warning' | 'error';
  description: string;
}

function PerformanceCard({ title, value, icon, status, description }: PerformanceCardProps) {
  const statusColors = {
    good: 'text-emerald-600 bg-emerald-50',
    warning: 'text-amber-600 bg-amber-50',
    error: 'text-red-600 bg-red-50'
  };

  const statusIcons = {
    good: <CheckCircle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    error: <XCircle className="h-4 w-4" />
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${statusColors[status]}`}>
              {icon}
            </div>
            <div className={`flex items-center gap-1 ${statusColors[status]} px-2 py-1 rounded-full text-xs`}>
              {statusIcons[status]}
              {status}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm font-medium text-slate-600">{title}</div>
            <div className="text-xs text-slate-500 mt-1">{description}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── CACHE PERFORMANCE TAB ───────────────────────────────────────────────────

function CachePerformanceTab({ cacheStats, cachePerformance }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Cache Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Cache Size</span>
            <Badge variant="outline">{cacheStats.size} entries</Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Hit Rate</span>
              <span>{cacheStats.hitRate.toFixed(1)}%</span>
            </div>
            <Progress value={cacheStats.hitRate} className="h-2" />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total Queries</span>
            <Badge variant="outline">{cachePerformance.queries}</Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Cache Hits</span>
            <Badge variant="secondary">{cachePerformance.cacheHits}</Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Cache Misses</span>
            <Badge variant="destructive">{cachePerformance.cacheMisses}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Cached Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cacheStats.topKeys.slice(0, 5).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                  <span className="text-sm font-medium">{item.key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {item.hits} hits
                  </Badge>
                  <Badge 
                    variant={item.hitRate > 80 ? "default" : item.hitRate > 60 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {item.hitRate.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── QUERY ANALYSIS TAB ──────────────────────────────────────────────────────

function QueryAnalysisTab({ queryStats }: any) {
  const slowQueries = Object.entries(queryStats)
    .filter(([_, stats]: [string, any]) => stats.avgTime > 500)
    .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.avgTime - a.avgTime);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Query Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(queryStats).map(([queryName, stats]: [string, any]) => (
              <div key={queryName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{queryName}</span>
                  <Badge 
                    variant={stats.avgTime < 100 ? "default" : stats.avgTime < 500 ? "secondary" : "destructive"}
                  >
                    {stats.avgTime.toFixed(0)}ms avg
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Executions:</span>
                    <div className="font-medium">{stats.count}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Time:</span>
                    <div className="font-medium">{stats.totalTime.toFixed(0)}ms</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>
                    <div className={`font-medium ${
                      stats.avgTime < 100 ? 'text-emerald-600' : 
                      stats.avgTime < 500 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {stats.avgTime < 100 ? 'Fast' : stats.avgTime < 500 ? 'Moderate' : 'Slow'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {slowQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Slow Queries (>500ms)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowQueries.map(([queryName, stats]: [string, any]) => (
                <div key={queryName} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="font-medium text-red-900">{queryName}</span>
                  <Badge variant="destructive">
                    {stats.avgTime.toFixed(0)}ms
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── DATABASE METRICS TAB ────────────────────────────────────────────────────

function DatabaseMetricsTab({ dbMetrics, isLoading, connectionStats }: any) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Table Sizes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dbMetrics?.table_sizes?.map((table: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{table.table}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{table.rows} rows</Badge>
                  <Badge variant="secondary">{table.size}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection Pool Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(connectionStats).map(([tenantId, count]: [string, any]) => (
              <div key={tenantId} className="flex items-center justify-between">
                <span className="text-sm font-medium">Tenant {tenantId.slice(0, 8)}...</span>
                <Badge 
                  variant={count < 5 ? "default" : count < 8 ? "secondary" : "destructive"}
                >
                  {count} connections
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── REALTIME STATS TAB ──────────────────────────────────────────────────────

function RealtimeStatsTab({ realtimeStats }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Subscription Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total Subscriptions</span>
            <Badge variant="outline">{realtimeStats.activeSubscriptions}</Badge>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm text-slate-600">Health Status</span>
            <div className={`flex items-center gap-2 ${
              realtimeStats.activeSubscriptions < 50 ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {realtimeStats.activeSubscriptions < 50 ? 
                <CheckCircle className="h-4 w-4" /> : 
                <AlertTriangle className="h-4 w-4" />
              }
              {realtimeStats.activeSubscriptions < 50 ? 'Healthy' : 'High Load'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions by Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(realtimeStats.subscriptionsByTenant).map(([tenantId, count]: [string, any]) => (
              <div key={tenantId} className="flex items-center justify-between">
                <span className="text-sm font-medium">Tenant {tenantId.slice(0, 8)}...</span>
                <Badge variant="outline">{count} subs</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PerformanceMonitor;