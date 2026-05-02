import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook for implementing intersection observer-based lazy loading
 * Validates: Requirements 11.2, 11.4, 11.5, 11.6
 */
export interface LazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useLazyLoading = (options: LazyLoadingOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Don't observe if already triggered and triggerOnce is true
    if (triggerOnce && hasTriggered) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        if (isVisible && !hasTriggered) {
          setHasTriggered(true);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return {
    ref: setRef,
    isIntersecting,
    hasTriggered,
    isVisible: triggerOnce ? hasTriggered : isIntersecting,
  };
};

/**
 * Hook for progressive loading of song metadata
 * Loads essential data first, then supplementary details
 */
export interface ProgressiveLoadingState {
  isLoadingEssential: boolean;
  isLoadingSupplementary: boolean;
  essentialLoaded: boolean;
  supplementaryLoaded: boolean;
  error: Error | null;
}

export const useProgressiveLoading = () => {
  const [state, setState] = useState<ProgressiveLoadingState>({
    isLoadingEssential: false,
    isLoadingSupplementary: false,
    essentialLoaded: false,
    supplementaryLoaded: false,
    error: null,
  });

  const loadEssential = useCallback(async (loadFn: () => Promise<any>) => {
    setState(prev => ({ ...prev, isLoadingEssential: true, error: null }));
    
    try {
      await loadFn();
      setState(prev => ({ 
        ...prev, 
        isLoadingEssential: false, 
        essentialLoaded: true 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoadingEssential: false, 
        error: error as Error 
      }));
    }
  }, []);

  const loadSupplementary = useCallback(async (loadFn: () => Promise<any>) => {
    setState(prev => ({ ...prev, isLoadingSupplementary: true }));
    
    try {
      await loadFn();
      setState(prev => ({ 
        ...prev, 
        isLoadingSupplementary: false, 
        supplementaryLoaded: true 
      }));
    } catch (error) {
      // Supplementary loading errors are less critical
      console.warn('Supplementary loading failed:', error);
      setState(prev => ({ 
        ...prev, 
        isLoadingSupplementary: false 
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoadingEssential: false,
      isLoadingSupplementary: false,
      essentialLoaded: false,
      supplementaryLoaded: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    loadEssential,
    loadSupplementary,
    reset,
  };
};

/**
 * Hook for managing loading skeletons during data fetching
 */
export const useLoadingSkeletons = (itemCount: number = 12) => {
  const [showSkeletons, setShowSkeletons] = useState(true);
  const [skeletonItems] = useState(() => 
    Array.from({ length: itemCount }, (_, i) => ({ id: `skeleton-${i}` }))
  );

  const hideSkeletons = useCallback(() => {
    setShowSkeletons(false);
  }, []);

  const showSkeletonsAgain = useCallback(() => {
    setShowSkeletons(true);
  }, []);

  return {
    showSkeletons,
    skeletonItems,
    hideSkeletons,
    showSkeletonsAgain,
  };
};