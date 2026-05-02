/**
 * Swipe Navigation Component for Mobile Song Library
 * 
 * Provides touch-friendly navigation with:
 * - Swipe gestures for view switching
 * - Haptic feedback for interactions
 * - Visual feedback during swipes
 * - Customizable swipe actions
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Grid3X3, List, Search, Settings } from 'lucide-react';
import { triggerHapticFeedback } from '../../utils/mobileUtils';

interface SwipeAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  action: () => void;
}

interface SwipeNavigationProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
  isEnabled?: boolean;
  className?: string;
}

export function SwipeNavigation({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 100,
  isEnabled = true,
  className = ''
}: SwipeNavigationProps) {
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Transform values for visual feedback
  const leftActionOpacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  const rightActionOpacity = useTransform(x, [0, -swipeThreshold], [0, 1]);
  const leftActionScale = useTransform(x, [0, swipeThreshold], [0.8, 1]);
  const rightActionScale = useTransform(x, [0, -swipeThreshold], [0.8, 1]);

  // Handle pan start
  const handlePanStart = useCallback(() => {
    if (!isEnabled) return;
    setIsSwipeActive(true);
    triggerHapticFeedback('light');
  }, [isEnabled]);

  // Handle pan during swipe
  const handlePan = useCallback((event: any, info: PanInfo) => {
    if (!isEnabled || !isSwipeActive) return;

    const { offset } = info;
    x.set(offset.x);
    y.set(offset.y);

    // Determine swipe direction
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    
    if (absX > absY) {
      // Horizontal swipe
      if (offset.x > 20) {
        setSwipeDirection('right');
      } else if (offset.x < -20) {
        setSwipeDirection('left');
      }
    } else {
      // Vertical swipe
      if (offset.y > 20) {
        setSwipeDirection('down');
      } else if (offset.y < -20) {
        setSwipeDirection('up');
      }
    }

    // Trigger haptic feedback at threshold
    if ((absX > swipeThreshold || absY > swipeThreshold) && swipeDirection) {
      triggerHapticFeedback('medium');
    }
  }, [isEnabled, isSwipeActive, swipeThreshold, swipeDirection, x, y]);

  // Handle pan end
  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    if (!isEnabled || !isSwipeActive) return;

    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    const velocityThreshold = 500;

    // Check if swipe meets threshold (distance or velocity)
    const isValidSwipe = (
      (absX > swipeThreshold || absY > swipeThreshold) ||
      (Math.abs(velocity.x) > velocityThreshold || Math.abs(velocity.y) > velocityThreshold)
    );

    if (isValidSwipe) {
      triggerHapticFeedback('heavy');

      // Determine final action based on direction and distance
      if (absX > absY) {
        // Horizontal swipe
        if (offset.x > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (offset.y > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    } else {
      triggerHapticFeedback('light');
    }

    // Reset state
    setIsSwipeActive(false);
    setSwipeDirection(null);
    x.set(0);
    y.set(0);
  }, [isEnabled, isSwipeActive, swipeThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, x, y]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-20 z-10"
          style={{ 
            opacity: leftActionOpacity,
            scale: leftActionScale,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {leftActions.map((action) => (
              <motion.button
                key={action.id}
                onClick={action.action}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg
                  ${action.color}
                `}
                whileTap={{ scale: 0.9 }}
              >
                <action.icon className="h-5 w-5" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-20 z-10"
          style={{ 
            opacity: rightActionOpacity,
            scale: rightActionScale,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {rightActions.map((action) => (
              <motion.button
                key={action.id}
                onClick={action.action}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg
                  ${action.color}
                `}
                whileTap={{ scale: 0.9 }}
              >
                <action.icon className="h-5 w-5" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        drag={isEnabled}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{ x, y }}
        className="relative z-20"
      >
        {children}
      </motion.div>

      {/* Swipe Indicators */}
      {isSwipeActive && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {/* Left swipe indicator */}
          {swipeDirection === 'right' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2"
            >
              <ChevronRight className="h-8 w-8 text-orange-500" />
            </motion.div>
          )}

          {/* Right swipe indicator */}
          {swipeDirection === 'left' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
            >
              <ChevronLeft className="h-8 w-8 text-orange-500" />
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// Predefined swipe actions for common use cases
export const commonSwipeActions = {
  search: {
    id: 'search',
    icon: Search,
    label: 'Search',
    color: 'bg-blue-500',
    action: () => console.log('Search action')
  },
  gridView: {
    id: 'grid-view',
    icon: Grid3X3,
    label: 'Grid View',
    color: 'bg-green-500',
    action: () => console.log('Grid view action')
  },
  listView: {
    id: 'list-view',
    icon: List,
    label: 'List View',
    color: 'bg-purple-500',
    action: () => console.log('List view action')
  },
  settings: {
    id: 'settings',
    icon: Settings,
    label: 'Settings',
    color: 'bg-gray-500',
    action: () => console.log('Settings action')
  },
};

export default SwipeNavigation;