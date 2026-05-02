/**
 * Mobile Utilities for Song Library UI Revamp
 * 
 * Utilities for mobile responsiveness, touch interactions, and device detection.
 * Supports Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import { useState, useEffect, useCallback } from 'react';

// Device detection utilities
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

export const isTablet = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};

export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const hasHoverCapability = () => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(hover: hover)').matches;
};

// Responsive breakpoints
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Hook for responsive behavior
export function useResponsive() {
  const [screenSize, setScreenSize] = useState<Breakpoint>('lg');
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isTabletDevice, setIsTabletDevice] = useState(false);
  const [isTouchEnabled, setIsTouchEnabled] = useState(false);
  const [hasHover, setHasHover] = useState(true);

  const updateScreenSize = useCallback(() => {
    const width = window.innerWidth;
    
    if (width < breakpoints.sm) {
      setScreenSize('xs');
    } else if (width < breakpoints.md) {
      setScreenSize('sm');
    } else if (width < breakpoints.lg) {
      setScreenSize('md');
    } else if (width < breakpoints.xl) {
      setScreenSize('lg');
    } else if (width < breakpoints['2xl']) {
      setScreenSize('xl');
    } else {
      setScreenSize('2xl');
    }

    setIsMobileDevice(isMobile());
    setIsTabletDevice(isTablet());
    setIsTouchEnabled(isTouchDevice());
    setHasHover(hasHoverCapability());
  }, []);

  useEffect(() => {
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [updateScreenSize]);

  return {
    screenSize,
    isMobile: isMobileDevice,
    isTablet: isTabletDevice,
    isTouch: isTouchEnabled,
    hasHover,
    isDesktop: !isMobileDevice && !isTabletDevice,
  };
}

// Grid column calculations for responsive layouts
export function getResponsiveColumns(screenSize: Breakpoint, cardSize: 'sm' | 'md' | 'lg' = 'md'): number {
  const cardWidths = {
    sm: 200,
    md: 240,
    lg: 280,
  };

  const minColumns = {
    xs: 1,
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4,
    '2xl': 5,
  };

  const maxColumns = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6,
    '2xl': 8,
  };

  // For mobile, always use single column for better UX
  if (screenSize === 'xs') {
    return 1;
  }

  // Calculate based on available space
  const containerWidth = window.innerWidth - 48; // Account for padding
  const cardWidth = cardWidths[cardSize];
  const gap = 24;
  
  const calculatedColumns = Math.floor((containerWidth + gap) / (cardWidth + gap));
  const min = minColumns[screenSize];
  const max = maxColumns[screenSize];
  
  return Math.max(min, Math.min(max, calculatedColumns));
}

// Touch gesture utilities
export interface TouchGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  duration: number;
  velocity: number;
}

export function useTouchGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50,
  velocityThreshold: number = 0.3
) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const endTime = Date.now();
    const duration = endTime - touchStart.time;
    
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    const gesture: TouchGesture = {
      startX: touchStart.x,
      startY: touchStart.y,
      endX: touch.clientX,
      endY: touch.clientY,
      deltaX,
      deltaY,
      duration,
      velocity,
    };

    // Check if gesture meets thresholds
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      if (velocity > velocityThreshold) {
        // Determine swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }
    }

    setTouchStart(null);
  }, [touchStart, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

// Haptic feedback utilities
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window === 'undefined' || !('navigator' in window)) return;

  // Check if device supports haptic feedback
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    
    navigator.vibrate(patterns[type]);
  }

  // For iOS devices with haptic feedback API
  if ('hapticFeedback' in window) {
    try {
      (window as any).hapticFeedback.impact(type);
    } catch (error) {
      // Silently fail if haptic feedback is not available
    }
  }
}

// Adaptive image loading based on device capabilities
export function getOptimalImageSize(
  screenSize: Breakpoint,
  isMobile: boolean,
  connectionSpeed?: 'slow' | 'fast'
): 'sm' | 'md' | 'lg' | 'xl' {
  // For mobile devices or slow connections, use smaller images
  if (isMobile || connectionSpeed === 'slow') {
    return screenSize === 'xs' ? 'sm' : 'md';
  }

  // For desktop with good connection, use larger images
  switch (screenSize) {
    case 'xs':
    case 'sm':
      return 'sm';
    case 'md':
      return 'md';
    case 'lg':
      return 'lg';
    case 'xl':
    case '2xl':
      return 'xl';
    default:
      return 'md';
  }
}

// Network speed detection
export function useNetworkSpeed() {
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast'>('fast');

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionSpeed = () => {
        // Consider 2G/3G as slow, 4G+ as fast
        const effectiveType = connection.effectiveType;
        setConnectionSpeed(
          effectiveType === '2g' || effectiveType === '3g' ? 'slow' : 'fast'
        );
      };

      updateConnectionSpeed();
      connection.addEventListener('change', updateConnectionSpeed);
      
      return () => {
        connection.removeEventListener('change', updateConnectionSpeed);
      };
    }
  }, []);

  return connectionSpeed;
}

// Mobile-optimized component variants
export const mobileVariants = {
  // Reduced motion for mobile devices
  reducedMotion: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  
  // Touch-friendly animations
  touchFriendly: {
    whileTap: { scale: 0.95 },
    transition: { duration: 0.1 },
  },
  
  // Mobile-optimized stagger
  mobileStagger: {
    container: {
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.03, // Faster stagger for mobile
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 10 },
      show: { opacity: 1, y: 0 },
    },
  },
};

// Touch-optimized button sizes
export const touchButtonSizes = {
  sm: 'min-h-[44px] min-w-[44px] px-4 py-2', // iOS minimum touch target
  md: 'min-h-[48px] min-w-[48px] px-6 py-3',
  lg: 'min-h-[52px] min-w-[52px] px-8 py-4',
};

// Mobile-specific CSS classes
export const mobileClasses = {
  // Touch-friendly spacing
  touchSpacing: 'p-4 gap-4',
  touchSpacingLarge: 'p-6 gap-6',
  
  // Mobile-optimized text sizes
  mobileText: {
    xs: 'text-xs leading-4',
    sm: 'text-sm leading-5',
    base: 'text-base leading-6',
    lg: 'text-lg leading-7',
    xl: 'text-xl leading-8',
  },
  
  // Mobile-safe z-indexes
  mobileZIndex: {
    modal: 'z-50',
    dropdown: 'z-40',
    sticky: 'z-30',
    overlay: 'z-20',
  },
};