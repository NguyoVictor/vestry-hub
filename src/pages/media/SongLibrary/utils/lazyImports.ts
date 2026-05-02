import { lazy } from 'react';

/**
 * Lazy imports for code splitting and bundle optimization
 * Validates: Requirements 11.7 (optimize bundle size through code splitting)
 */

// Heavy components that should be loaded on demand
export const LazyChordTransposition = lazy(() => 
  import('../components/ChordTransposition').then(module => ({
    default: module.ChordTransposition
  }))
);

export const LazySetlistBuilder = lazy(() => 
  import('../components/SetlistBuilder').then(module => ({
    default: module.SetlistBuilder
  }))
);

export const LazyCommandPalette = lazy(() => 
  import('../components/CommandPalette').then(module => ({
    default: module.CommandPalette
  }))
);

export const LazyAdvancedFiltering = lazy(() => 
  import('../components/AdvancedFiltering').then(module => ({
    default: module.AdvancedFiltering
  }))
);

export const LazyUsageAnalytics = lazy(() => 
  import('../components/SmartOrganization').then(module => ({
    default: module.UsageAnalytics
  }))
);

export const LazyCollaborationPanel = lazy(() => 
  import('../components/SetlistBuilder/CollaborationPanel').then(module => ({
    default: module.CollaborationPanel
  }))
);

// React Bits components are imported from the main package
// They are already available through the components that use them
export const LazyReactBits = {
  // React Bits components are bundled with their parent components
  // No need to lazy load them separately
};

// Chart components (heavy libraries)
export const LazyCharts = {
  UsageChart: lazy(() => 
    import('../components/SmartOrganization/UsageChart').then(module => ({
      default: module.UsageChart
    }))
  ),
};

// Import/Export utilities (heavy processing)
export const LazyImportExport = {
  ImportDialog: lazy(() => 
    import('../components/ImportExport').then(module => ({
      default: module.ImportDialog
    }))
  ),
  
  ExportDialog: lazy(() => 
    import('../components/ImportExport').then(module => ({
      default: module.ExportDialog
    }))
  ),
  
  ImportExportActions: lazy(() => 
    import('../components/ImportExport').then(module => ({
      default: module.ImportExportActions
    }))
  ),
};

// Color extraction utilities (heavy image processing)
export const LazyColorExtractor = lazy(() => 
  import('../components/CoverArt/ColorExtractor').then(module => ({
    default: module.ColorExtractor
  }))
);

/**
 * Preload functions for critical path optimization
 */
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  const criticalImports = [
    import('../components/SongGrid'),
    import('../components/SongList'),
    import('../components/ViewModeToggle'),
    import('../components/ThemeProvider'),
  ];

  return Promise.allSettled(criticalImports);
};

export const preloadSecondaryComponents = () => {
  // Preload components for enhanced UX
  const secondaryImports = [
    import('../components/CommandPalette'),
    import('../components/ChordTransposition'),
    import('../components/CoverArt'),
  ];

  return Promise.allSettled(secondaryImports);
};

export const preloadHeavyComponents = () => {
  // Preload heavy components in the background
  const heavyImports = [
    import('../components/SetlistBuilder'),
    import('../components/AdvancedFiltering'),
    import('../components/SmartOrganization'),
  ];

  return Promise.allSettled(heavyImports);
};

/**
 * Dynamic import utilities with error handling
 */
export const dynamicImport = async <T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
): Promise<T> => {
  try {
    const module = await importFn();
    return module.default;
  } catch (error) {
    console.warn('Dynamic import failed:', error);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
};

/**
 * Bundle analysis utilities
 */
export const bundleAnalytics = {
  // Track which components are loaded
  loadedComponents: new Set<string>(),
  
  // Track loading times
  loadingTimes: new Map<string, number>(),
  
  markComponentLoaded: (componentName: string) => {
    bundleAnalytics.loadedComponents.add(componentName);
  },
  
  trackLoadingTime: (componentName: string, startTime: number) => {
    const loadTime = Date.now() - startTime;
    bundleAnalytics.loadingTimes.set(componentName, loadTime);
  },
  
  getStats: () => ({
    loadedComponents: Array.from(bundleAnalytics.loadedComponents),
    averageLoadTime: Array.from(bundleAnalytics.loadingTimes.values())
      .reduce((sum, time) => sum + time, 0) / bundleAnalytics.loadingTimes.size || 0,
    totalComponents: bundleAnalytics.loadedComponents.size,
  }),
};