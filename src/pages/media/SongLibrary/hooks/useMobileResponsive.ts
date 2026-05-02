/**
 * Mobile Responsive Hook for Song Library UI Revamp
 * 
 * Provides mobile-specific state management and responsive behavior.
 * Handles view mode adaptation, touch interactions, and performance optimizations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  useResponsive, 
  getResponsiveColumns, 
  useTouchGestures,
  useNetworkSpeed,
  getOptimalImageSize,
  triggerHapticFeedback,
  mobileVariants,
  type Breakpoint 
} from '../utils/mobileUtils';

interface MobileResponsiveConfig {
  enableTouchGestures?: boolean;
  enableHapticFeedback?: boolean;
  adaptiveImageLoading?: boolean;
  autoSwitchToListOnMobile?: boolean;
  touchOptimizedAnimations?: boolean;
}

export function useMobileResponsive(config: MobileResponsiveConfig = {}) {
  const {
    enableTouchGestures = true,
    enableHapticFeedback = true,
    adaptiveImageLoading = true,
    autoSwitchToListOnMobile = true,
    touchOptimizedAnimations = true,
  } = config;

  const responsive = useResponsive();
  const connectionSpeed = useNetworkSpeed();
  
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');
  const [touchInteractionEnabled, setTouchInteractionEnabled] = useState(false);

  // Determine optimal view mode for mobile
  const optimalViewMode = useMemo(() => {
    if (autoSwitchToListOnMobile && responsive.isMobile) {
      return 'list'; // List view is more touch-friendly on mobile
    }
    return mobileViewMode;
  }, [responsive.isMobile, mobileViewMode, autoSwitchToListOnMobile]);

  // Calculate responsive grid columns
  const gridColumns = useMemo(() => {
    return getResponsiveColumns(responsive.screenSize, 'md');
  }, [responsive.screenSize]);

  // Determine optimal image size based on device and connection
  const optimalImageSize = useMemo(() => {
    return adaptiveImageLoading 
      ? getOptimalImageSize(responsive.screenSize, responsive.isMobile, connectionSpeed)
      : 'md';
  }, [responsive.screenSize, responsive.isMobile, connectionSpeed, adaptiveImageLoading]);

  // Mobile-optimized animation variants
  const animationVariants = useMemo(() => {
    if (touchOptimizedAnimations && (responsive.isMobile || responsive.isTouch)) {
      return mobileVariants;
    }
    
    // Desktop variants with more elaborate animations
    return {
      reducedMotion: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.4, ease: "easeOut" },
      },
      touchFriendly: {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.2 },
      },
      mobileStagger: {
        container: {
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        },
        item: {
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0 },
        },
      },
    };
  }, [touchOptimizedAnimations, responsive.isMobile, responsive.isTouch]);

  // Touch gesture handlers
  const handleSwipeLeft = useCallback(() => {
    if (enableHapticFeedback) {
      triggerHapticFeedback('light');
    }
    // Could be used for navigation or view switching
    console.log('Swipe left detected');
  }, [enableHapticFeedback]);

  const handleSwipeRight = useCallback(() => {
    if (enableHapticFeedback) {
      triggerHapticFeedback('light');
    }
    // Could be used for navigation or view switching
    console.log('Swipe right detected');
  }, [enableHapticFeedback]);

  const handleSwipeUp = useCallback(() => {
    if (enableHapticFeedback) {
      triggerHapticFeedback('light');
    }
    // Could be used for refreshing or loading more content
    console.log('Swipe up detected');
  }, [enableHapticFeedback]);

  const handleSwipeDown = useCallback(() => {
    if (enableHapticFeedback) {
      triggerHapticFeedback('light');
    }
    // Could be used for refreshing content
    console.log('Swipe down detected');
  }, [enableHapticFeedback]);

  // Touch gesture hooks
  const touchGestures = useTouchGestures(
    enableTouchGestures ? handleSwipeLeft : undefined,
    enableTouchGestures ? handleSwipeRight : undefined,
    enableTouchGestures ? handleSwipeUp : undefined,
    enableTouchGestures ? handleSwipeDown : undefined
  );

  // Handle view mode changes with haptic feedback
  const handleViewModeChange = useCallback((viewMode: 'grid' | 'list') => {
    if (enableHapticFeedback && responsive.isTouch) {
      triggerHapticFeedback('medium');
    }
    setMobileViewMode(viewMode);
  }, [enableHapticFeedback, responsive.isTouch]);

  // Handle touch interactions
  const handleTouchInteraction = useCallback((type: 'tap' | 'longPress' | 'doubleTap') => {
    if (!enableHapticFeedback || !responsive.isTouch) return;

    switch (type) {
      case 'tap':
        triggerHapticFeedback('light');
        break;
      case 'longPress':
        triggerHapticFeedback('heavy');
        break;
      case 'doubleTap':
        triggerHapticFeedback('medium');
        break;
    }
  }, [enableHapticFeedback, responsive.isTouch]);

  // Enable touch interactions when on touch device
  useEffect(() => {
    setTouchInteractionEnabled(responsive.isTouch && enableTouchGestures);
  }, [responsive.isTouch, enableTouchGestures]);

  // Mobile-specific CSS classes
  const mobileClasses = useMemo(() => {
    const classes = [];

    if (responsive.isMobile) {
      classes.push('mobile-optimized');
    }

    if (responsive.isTouch) {
      classes.push('touch-enabled');
    }

    if (!responsive.hasHover) {
      classes.push('no-hover');
    }

    return classes.join(' ');
  }, [responsive.isMobile, responsive.isTouch, responsive.hasHover]);

  // Performance optimizations for mobile
  const performanceConfig = useMemo(() => {
    return {
      // Reduce animation complexity on mobile
      enableComplexAnimations: !responsive.isMobile,
      
      // Adjust virtual scrolling parameters
      virtualScrolling: {
        enabled: true,
        overscan: responsive.isMobile ? 2 : 5, // Fewer items rendered on mobile
        itemSize: responsive.isMobile ? 280 : 320,
      },
      
      // Image loading strategy
      imageLoading: {
        lazy: true,
        placeholder: true,
        sizes: optimalImageSize,
        quality: connectionSpeed === 'slow' ? 'medium' : 'high',
      },
      
      // Debounce search on mobile for better performance
      searchDebounce: responsive.isMobile ? 300 : 150,
    };
  }, [responsive.isMobile, optimalImageSize, connectionSpeed]);

  return {
    // Responsive state
    ...responsive,
    
    // Mobile-specific state
    optimalViewMode,
    gridColumns,
    optimalImageSize,
    touchInteractionEnabled,
    mobileClasses,
    
    // Animation variants
    animationVariants,
    
    // Touch gesture handlers
    touchGestures,
    
    // Interaction handlers
    handleViewModeChange,
    handleTouchInteraction,
    
    // Performance configuration
    performanceConfig,
    
    // Utility functions
    triggerHaptic: (type: 'light' | 'medium' | 'heavy') => {
      if (enableHapticFeedback && responsive.isTouch) {
        triggerHapticFeedback(type);
      }
    },
    
    // Connection info
    connectionSpeed,
  };
}

// Hook for mobile-optimized command palette
export function useMobileCommandPalette() {
  const responsive = useResponsive();
  
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'compact' | 'fullscreen'>('compact');

  // Determine search mode based on screen size
  useEffect(() => {
    if (responsive.isMobile) {
      setSearchMode('fullscreen');
    } else {
      setSearchMode('compact');
    }
  }, [responsive.isMobile]);

  const openMobileSearch = useCallback(() => {
    setIsMobileSearchOpen(true);
    if (responsive.isTouch) {
      triggerHapticFeedback('medium');
    }
  }, [responsive.isTouch]);

  const closeMobileSearch = useCallback(() => {
    setIsMobileSearchOpen(false);
    if (responsive.isTouch) {
      triggerHapticFeedback('light');
    }
  }, [responsive.isTouch]);

  return {
    isMobileSearchOpen,
    searchMode,
    openMobileSearch,
    closeMobileSearch,
    isMobile: responsive.isMobile,
    isTouch: responsive.isTouch,
  };
}

// Hook for mobile-optimized drag and drop
export function useMobileDragDrop() {
  const responsive = useResponsive();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'mouse' | 'touch'>('mouse');

  useEffect(() => {
    setDragMode(responsive.isTouch ? 'touch' : 'mouse');
  }, [responsive.isTouch]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    if (responsive.isTouch) {
      triggerHapticFeedback('medium');
    }
  }, [responsive.isTouch]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    if (responsive.isTouch) {
      triggerHapticFeedback('light');
    }
  }, [responsive.isTouch]);

  return {
    isDragging,
    dragMode,
    handleDragStart,
    handleDragEnd,
    isTouchDrag: dragMode === 'touch',
    dragConfig: {
      // Touch-friendly drag configuration
      activationConstraint: responsive.isTouch 
        ? { delay: 150, tolerance: 5 } // Longer delay for touch to prevent accidental drags
        : { distance: 5 },
    },
  };
}