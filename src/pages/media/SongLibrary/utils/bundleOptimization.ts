/**
 * Bundle optimization utilities for Song Library
 * Validates: Requirements 11.7 (optimize bundle size and loading performance)
 */

import { preloadCriticalComponents, preloadSecondaryComponents, preloadHeavyComponents } from './lazyImports';

/**
 * Resource loading priorities
 */
export enum LoadingPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  IDLE = 'idle',
}

/**
 * Resource loading scheduler
 */
class ResourceScheduler {
  private queues = new Map<LoadingPriority, Array<() => Promise<any>>>();
  private isProcessing = false;
  private idleCallback: number | null = null;

  constructor() {
    // Initialize priority queues
    Object.values(LoadingPriority).forEach(priority => {
      this.queues.set(priority, []);
    });
  }

  /**
   * Schedule a resource to load with given priority
   */
  schedule(loadFn: () => Promise<any>, priority: LoadingPriority = LoadingPriority.MEDIUM): Promise<any> {
    return new Promise((resolve, reject) => {
      const wrappedFn = async () => {
        try {
          const result = await loadFn();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      };

      const queue = this.queues.get(priority);
      if (queue) {
        queue.push(wrappedFn);
        this.processQueues();
      }
    });
  }

  /**
   * Process queues based on priority
   */
  private async processQueues() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Process critical and high priority items immediately
      await this.processQueue(LoadingPriority.CRITICAL);
      await this.processQueue(LoadingPriority.HIGH);

      // Process medium priority items with small delay
      setTimeout(() => this.processQueue(LoadingPriority.MEDIUM), 100);

      // Process low priority items when browser is idle
      this.scheduleIdleWork(() => {
        this.processQueue(LoadingPriority.LOW);
        this.processQueue(LoadingPriority.IDLE);
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a specific priority queue
   */
  private async processQueue(priority: LoadingPriority) {
    const queue = this.queues.get(priority);
    if (!queue || queue.length === 0) return;

    const batch = queue.splice(0, priority === LoadingPriority.CRITICAL ? 10 : 3);
    
    try {
      await Promise.allSettled(batch.map(fn => fn()));
    } catch (error) {
      console.warn(`Error processing ${priority} priority queue:`, error);
    }
  }

  /**
   * Schedule work for when browser is idle
   */
  private scheduleIdleWork(callback: () => void) {
    if (this.idleCallback) {
      cancelIdleCallback(this.idleCallback);
    }

    if ('requestIdleCallback' in window) {
      this.idleCallback = requestIdleCallback(callback, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(callback, 1000);
    }
  }

  /**
   * Clear all queues
   */
  clear() {
    this.queues.forEach(queue => queue.length = 0);
    if (this.idleCallback) {
      cancelIdleCallback(this.idleCallback);
      this.idleCallback = null;
    }
  }
}

export const resourceScheduler = new ResourceScheduler();

/**
 * Preloading strategies based on user behavior
 */
export const preloadingStrategies = {
  /**
   * Preload components based on route
   */
  onRouteEnter: async (route: string) => {
    switch (route) {
      case '/media/song-library':
        await resourceScheduler.schedule(
          preloadCriticalComponents,
          LoadingPriority.CRITICAL
        );
        
        // Preload secondary components after critical ones
        resourceScheduler.schedule(
          preloadSecondaryComponents,
          LoadingPriority.HIGH
        );
        break;

      case '/media/song-library/setlist':
        await resourceScheduler.schedule(
          () => import('../components/SetlistBuilder'),
          LoadingPriority.CRITICAL
        );
        break;

      case '/media/song-library/search':
        await resourceScheduler.schedule(
          () => import('../components/CommandPalette'),
          LoadingPriority.CRITICAL
        );
        break;
    }
  },

  /**
   * Preload based on user interactions
   */
  onUserInteraction: (interaction: string) => {
    switch (interaction) {
      case 'hover-setlist-button':
        resourceScheduler.schedule(
          () => import('../components/SetlistBuilder'),
          LoadingPriority.HIGH
        );
        break;

      case 'hover-search-button':
        resourceScheduler.schedule(
          () => import('../components/CommandPalette'),
          LoadingPriority.HIGH
        );
        break;

      case 'hover-transpose-button':
        resourceScheduler.schedule(
          () => import('../components/ChordTransposition'),
          LoadingPriority.HIGH
        );
        break;

      case 'scroll-near-bottom':
        // Preload heavy components when user is engaged
        resourceScheduler.schedule(
          preloadHeavyComponents,
          LoadingPriority.MEDIUM
        );
        break;
    }
  },

  /**
   * Preload during idle time
   */
  onIdle: () => {
    resourceScheduler.schedule(
      preloadHeavyComponents,
      LoadingPriority.IDLE
    );

    // React Bits components are already bundled with the main components
    // No need to preload them separately
  },
};

/**
 * Bundle size monitoring
 */
export const bundleMonitor = {
  // Track loaded chunks
  loadedChunks: new Set<string>(),
  
  // Track loading performance
  loadingMetrics: {
    totalLoadTime: 0,
    chunkCount: 0,
    failedLoads: 0,
  },

  /**
   * Track chunk loading
   */
  trackChunkLoad: (chunkName: string, loadTime: number, success: boolean) => {
    bundleMonitor.loadedChunks.add(chunkName);
    bundleMonitor.loadingMetrics.chunkCount++;
    bundleMonitor.loadingMetrics.totalLoadTime += loadTime;
    
    if (!success) {
      bundleMonitor.loadingMetrics.failedLoads++;
    }
  },

  /**
   * Get performance metrics
   */
  getMetrics: () => ({
    ...bundleMonitor.loadingMetrics,
    averageLoadTime: bundleMonitor.loadingMetrics.chunkCount > 0 
      ? bundleMonitor.loadingMetrics.totalLoadTime / bundleMonitor.loadingMetrics.chunkCount 
      : 0,
    successRate: bundleMonitor.loadingMetrics.chunkCount > 0
      ? (bundleMonitor.loadingMetrics.chunkCount - bundleMonitor.loadingMetrics.failedLoads) / bundleMonitor.loadingMetrics.chunkCount
      : 1,
    loadedChunks: Array.from(bundleMonitor.loadedChunks),
  }),

  /**
   * Log performance summary
   */
  logSummary: () => {
    const metrics = bundleMonitor.getMetrics();
    console.group('Bundle Loading Performance');
    console.log('Chunks Loaded:', metrics.chunkCount);
    console.log('Average Load Time:', `${metrics.averageLoadTime.toFixed(2)}ms`);
    console.log('Success Rate:', `${(metrics.successRate * 100).toFixed(1)}%`);
    console.log('Failed Loads:', metrics.failedLoads);
    console.groupEnd();
  },
};

/**
 * Network-aware loading
 */
export const networkAwareLoading = {
  /**
   * Get connection quality
   */
  getConnectionQuality: (): 'fast' | 'slow' | 'offline' => {
    if (!navigator.onLine) return 'offline';
    
    const connection = (navigator as any).connection;
    if (!connection) return 'fast'; // Assume fast if no info available
    
    const { effectiveType, downlink } = connection;
    
    if (effectiveType === '4g' && downlink > 1.5) return 'fast';
    if (effectiveType === '3g' || downlink > 0.5) return 'slow';
    return 'slow';
  },

  /**
   * Adjust loading strategy based on connection
   */
  adjustStrategy: () => {
    const quality = networkAwareLoading.getConnectionQuality();
    
    switch (quality) {
      case 'fast':
        // Aggressive preloading
        preloadingStrategies.onIdle();
        break;
        
      case 'slow':
        // Conservative preloading - only critical components
        resourceScheduler.schedule(
          preloadCriticalComponents,
          LoadingPriority.HIGH
        );
        break;
        
      case 'offline':
        // No preloading, rely on cache
        break;
    }
  },
};

/**
 * Initialize bundle optimization
 */
export const initializeBundleOptimization = () => {
  // Adjust strategy based on network conditions
  networkAwareLoading.adjustStrategy();
  
  // Listen for network changes
  window.addEventListener('online', networkAwareLoading.adjustStrategy);
  window.addEventListener('offline', networkAwareLoading.adjustStrategy);
  
  // Set up idle preloading
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadingStrategies.onIdle();
    }, { timeout: 10000 });
  }
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    resourceScheduler.clear();
  });
};