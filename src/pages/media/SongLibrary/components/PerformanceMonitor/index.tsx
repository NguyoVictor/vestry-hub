import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Database, Clock } from 'lucide-react';
import { bundleMonitor } from '../../utils/bundleOptimization';
import { cacheMonitor } from '../../utils/caching';
import { bundleAnalytics } from '../../utils/lazyImports';

/**
 * Performance monitoring component for development and debugging
 * Shows real-time performance metrics for the Song Library
 */

interface PerformanceMetrics {
  bundleMetrics: ReturnType<typeof bundleMonitor.getMetrics>;
  cacheStats: ReturnType<typeof cacheMonitor.getStats>;
  componentStats: ReturnType<typeof bundleAnalytics.getStats>;
  memoryUsage?: MemoryInfo;
  renderTime: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
  compact = false,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [renderStartTime] = useState(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const updateMetrics = () => {
      const bundleMetrics = bundleMonitor.getMetrics();
      const cacheStats = cacheMonitor.getStats();
      const componentStats = bundleAnalytics.getStats();
      const memoryUsage = (performance as any).memory;
      const renderTime = Date.now() - renderStartTime;

      setMetrics({
        bundleMetrics,
        cacheStats,
        componentStats,
        memoryUsage,
        renderTime,
      });
    };

    // Update metrics every 2 seconds
    const interval = setInterval(updateMetrics, 2000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [enabled, renderStartTime]);

  if (!enabled || !metrics) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const cacheHitRatio = cacheMonitor.getHitRatio();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`fixed ${positionClasses[position]} z-50 font-mono text-xs`}
    >
      <div className="bg-black/80 backdrop-blur-sm text-white rounded-lg border border-white/20 shadow-xl">
        {/* Header */}
        <div
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Activity className="h-3 w-3 text-green-400" />
          <span className="font-semibold">Performance</span>
          <div className="flex items-center gap-1 ml-auto">
            <div className={`h-2 w-2 rounded-full ${
              cacheHitRatio > 0.8 ? 'bg-green-400' : 
              cacheHitRatio > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <span className="text-xs opacity-75">
              {(cacheHitRatio * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/20"
          >
            <div className="p-3 space-y-3 min-w-[280px]">
              {/* Bundle Metrics */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-blue-400" />
                  <span className="font-medium">Bundle Loading</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs opacity-75">
                  <div>Chunks: {metrics.bundleMetrics.chunkCount}</div>
                  <div>Avg: {metrics.bundleMetrics.averageLoadTime.toFixed(0)}ms</div>
                  <div>Success: {(metrics.bundleMetrics.successRate * 100).toFixed(0)}%</div>
                  <div>Failed: {metrics.bundleMetrics.failedLoads}</div>
                </div>
              </div>

              {/* Cache Stats */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Database className="h-3 w-3 text-purple-400" />
                  <span className="font-medium">Cache Performance</span>
                </div>
                <div className="space-y-1 text-xs opacity-75">
                  <div className="flex justify-between">
                    <span>Songs:</span>
                    <span>{metrics.cacheStats.songs.hits}/{metrics.cacheStats.songs.hits + metrics.cacheStats.songs.misses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cover Art:</span>
                    <span>{metrics.cacheStats.coverArt.hits}/{metrics.cacheStats.coverArt.hits + metrics.cacheStats.coverArt.misses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Search:</span>
                    <span>{metrics.cacheStats.search.hits}/{metrics.cacheStats.search.hits + metrics.cacheStats.search.misses}</span>
                  </div>
                </div>
              </div>

              {/* Component Stats */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-orange-400" />
                  <span className="font-medium">Components</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs opacity-75">
                  <div>Loaded: {metrics.componentStats.totalComponents}</div>
                  <div>Avg: {metrics.componentStats.averageLoadTime.toFixed(0)}ms</div>
                </div>
              </div>

              {/* Memory Usage (if available) */}
              {metrics.memoryUsage && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Activity className="h-3 w-3 text-red-400" />
                    <span className="font-medium">Memory</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs opacity-75">
                    <div>Used: {(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
                    <div>Limit: {(metrics.memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(0)}MB</div>
                  </div>
                </div>
              )}

              {/* Render Time */}
              <div className="pt-2 border-t border-white/20">
                <div className="flex justify-between text-xs">
                  <span className="opacity-75">Render Time:</span>
                  <span className={`font-medium ${
                    metrics.renderTime < 1000 ? 'text-green-400' :
                    metrics.renderTime < 3000 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {metrics.renderTime}ms
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Performance logger for console output
 */
export const logPerformanceMetrics = () => {
  console.group('🚀 Song Library Performance Metrics');
  
  // Bundle metrics
  bundleMonitor.logSummary();
  
  // Cache metrics
  cacheMonitor.logStats();
  
  // Component metrics
  const componentStats = bundleAnalytics.getStats();
  console.log('Components Loaded:', componentStats.totalComponents);
  console.log('Average Load Time:', `${componentStats.averageLoadTime.toFixed(2)}ms`);
  
  // Memory usage
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(0)}MB`,
    });
  }
  
  console.groupEnd();
};

// Auto-log performance metrics in development
if (process.env.NODE_ENV === 'development') {
  // Log metrics after initial load
  setTimeout(logPerformanceMetrics, 5000);
  
  // Log metrics periodically
  setInterval(logPerformanceMetrics, 30000);
}