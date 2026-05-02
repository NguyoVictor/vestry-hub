import React, { Suspense, ComponentType } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { bundleAnalytics } from '../../utils/lazyImports';

/**
 * Wrapper component for lazy-loaded components with loading states
 * Validates: Requirements 11.7 (code splitting and bundle optimization)
 */

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
  className?: string;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  componentName,
  className,
}) => {
  const defaultFallback = (
    <div className={className}>
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );

  return (
    <Suspense
      fallback={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="animate-pulse"
        >
          {fallback || defaultFallback}
        </motion.div>
      }
    >
      <ComponentTracker componentName={componentName}>
        {children}
      </ComponentTracker>
    </Suspense>
  );
};

/**
 * HOC for tracking component loading analytics
 */
interface ComponentTrackerProps {
  componentName?: string;
  children: React.ReactNode;
}

const ComponentTracker: React.FC<ComponentTrackerProps> = ({
  componentName,
  children,
}) => {
  React.useEffect(() => {
    if (componentName) {
      bundleAnalytics.markComponentLoaded(componentName);
    }
  }, [componentName]);

  return <>{children}</>;
};

/**
 * HOC for creating lazy-loaded components with built-in error boundaries
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options: {
    componentName?: string;
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
  } = {}
) {
  const LazyComponent = React.forwardRef<any, P>((props, ref) => {
    const startTime = React.useRef(Date.now());

    React.useEffect(() => {
      if (options.componentName) {
        bundleAnalytics.trackLoadingTime(options.componentName, startTime.current);
      }
    }, []);

    return (
      <ErrorBoundary fallback={options.errorFallback}>
        <LazyWrapper
          componentName={options.componentName}
          fallback={options.fallback}
        >
          <Component {...props} ref={ref} />
        </LazyWrapper>
      </ErrorBoundary>
    );
  });

  LazyComponent.displayName = `LazyLoaded(${Component.displayName || Component.name})`;
  
  return LazyComponent;
}

/**
 * Error boundary for lazy-loaded components
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              Failed to load component. Please refresh the page.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Specialized lazy wrappers for different component types
 */
export const LazyCardWrapper: React.FC<LazyWrapperProps> = (props) => (
  <LazyWrapper
    {...props}
    fallback={
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    }
  />
);

export const LazyModalWrapper: React.FC<LazyWrapperProps> = (props) => (
  <LazyWrapper
    {...props}
    fallback={
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    }
  />
);

export const LazyPanelWrapper: React.FC<LazyWrapperProps> = (props) => (
  <LazyWrapper
    {...props}
    fallback={
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <Skeleton className="h-5 w-1/4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    }
  />
);