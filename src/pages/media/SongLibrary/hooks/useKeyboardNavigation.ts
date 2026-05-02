/**
 * Keyboard Navigation Hook for Song Library UI Revamp
 * 
 * Provides comprehensive keyboard navigation functionality for all interactive elements.
 * Supports grid navigation, list navigation, and custom navigation patterns.
 * 
 * Requirements: 12.1, 12.3, 12.4, 12.5
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useKeyboardShortcut } from './useKeyboardShortcut';

export interface KeyboardNavigationOptions {
  /** Total number of items to navigate */
  itemCount: number;
  /** Navigation orientation */
  orientation?: 'horizontal' | 'vertical' | 'grid';
  /** Number of columns for grid navigation */
  columns?: number;
  /** Whether navigation wraps around */
  wrap?: boolean;
  /** Whether navigation is enabled */
  enabled?: boolean;
  /** Initial focus index */
  initialIndex?: number;
  /** Callback when focus changes */
  onFocusChange?: (index: number) => void;
  /** Callback when item is activated (Enter/Space) */
  onActivate?: (index: number) => void;
  /** Custom key handlers */
  customKeyHandlers?: Record<string, (index: number) => void>;
}

export interface KeyboardNavigationState {
  /** Current focus index */
  focusIndex: number;
  /** Whether keyboard navigation is active */
  isActive: boolean;
  /** Set focus to specific index */
  setFocusIndex: (index: number) => void;
  /** Move focus by offset */
  moveFocus: (offset: number) => void;
  /** Activate current item */
  activate: () => void;
  /** Reset navigation state */
  reset: () => void;
  /** Key event handler for components */
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Hook for managing keyboard navigation in lists and grids
 */
export function useKeyboardNavigation(
  options: KeyboardNavigationOptions
): KeyboardNavigationState {
  const {
    itemCount,
    orientation = 'vertical',
    columns = 1,
    wrap = true,
    enabled = true,
    initialIndex = 0,
    onFocusChange,
    onActivate,
    customKeyHandlers = {}
  } = options;

  const [focusIndex, setFocusIndex] = useState(initialIndex);
  const [isActive, setIsActive] = useState(false);
  const lastInteractionRef = useRef<'mouse' | 'keyboard'>('mouse');

  // Clamp index to valid range
  const clampIndex = useCallback((index: number): number => {
    if (itemCount === 0) return -1;
    
    if (wrap) {
      return ((index % itemCount) + itemCount) % itemCount;
    } else {
      return Math.max(0, Math.min(itemCount - 1, index));
    }
  }, [itemCount, wrap]);

  // Update focus index with validation
  const updateFocusIndex = useCallback((newIndex: number) => {
    const clampedIndex = clampIndex(newIndex);
    if (clampedIndex !== focusIndex && clampedIndex >= 0) {
      setFocusIndex(clampedIndex);
      onFocusChange?.(clampedIndex);
    }
  }, [focusIndex, clampIndex, onFocusChange]);

  // Move focus by offset
  const moveFocus = useCallback((offset: number) => {
    if (!enabled || itemCount === 0) return;

    let newIndex: number;

    if (orientation === 'grid') {
      const currentRow = Math.floor(focusIndex / columns);
      const currentCol = focusIndex % columns;
      const totalRows = Math.ceil(itemCount / columns);

      switch (offset) {
        case -columns: // Up
          newIndex = wrap 
            ? ((currentRow - 1 + totalRows) % totalRows) * columns + currentCol
            : Math.max(0, focusIndex - columns);
          break;
        case columns: // Down
          newIndex = wrap
            ? ((currentRow + 1) % totalRows) * columns + currentCol
            : Math.min(itemCount - 1, focusIndex + columns);
          break;
        case -1: // Left
          if (currentCol === 0 && wrap) {
            newIndex = Math.min(itemCount - 1, (currentRow + 1) * columns - 1);
          } else {
            newIndex = Math.max(currentRow * columns, focusIndex - 1);
          }
          break;
        case 1: // Right
          if (currentCol === columns - 1 && wrap) {
            newIndex = currentRow * columns;
          } else {
            newIndex = Math.min(itemCount - 1, focusIndex + 1);
          }
          break;
        default:
          newIndex = clampIndex(focusIndex + offset);
      }
    } else {
      newIndex = clampIndex(focusIndex + offset);
    }

    // Ensure the new index is valid for grid layouts
    if (orientation === 'grid' && newIndex >= itemCount) {
      newIndex = itemCount - 1;
    }

    updateFocusIndex(newIndex);
  }, [enabled, itemCount, orientation, columns, focusIndex, wrap, clampIndex, updateFocusIndex]);

  // Activate current item
  const activate = useCallback(() => {
    if (enabled && focusIndex >= 0 && focusIndex < itemCount) {
      onActivate?.(focusIndex);
    }
  }, [enabled, focusIndex, itemCount, onActivate]);

  // Reset navigation state
  const reset = useCallback(() => {
    setFocusIndex(initialIndex);
    setIsActive(false);
    lastInteractionRef.current = 'mouse';
  }, [initialIndex]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enabled) return;

    // Mark as keyboard interaction
    lastInteractionRef.current = 'keyboard';
    setIsActive(true);

    const { key, shiftKey, ctrlKey, metaKey } = event;

    // Check for custom key handlers first
    const customHandler = customKeyHandlers[key];
    if (customHandler) {
      event.preventDefault();
      customHandler(focusIndex);
      return;
    }

    // Handle navigation keys
    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        if (orientation === 'grid') {
          moveFocus(-columns);
        } else if (orientation === 'vertical') {
          moveFocus(-1);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (orientation === 'grid') {
          moveFocus(columns);
        } else if (orientation === 'vertical') {
          moveFocus(1);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (orientation === 'grid') {
          moveFocus(-1);
        } else if (orientation === 'horizontal') {
          moveFocus(-1);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (orientation === 'grid') {
          moveFocus(1);
        } else if (orientation === 'horizontal') {
          moveFocus(1);
        }
        break;

      case 'Home':
        event.preventDefault();
        if (ctrlKey || metaKey) {
          updateFocusIndex(0);
        } else if (orientation === 'grid') {
          // Move to start of current row
          const currentRow = Math.floor(focusIndex / columns);
          updateFocusIndex(currentRow * columns);
        } else {
          updateFocusIndex(0);
        }
        break;

      case 'End':
        event.preventDefault();
        if (ctrlKey || metaKey) {
          updateFocusIndex(itemCount - 1);
        } else if (orientation === 'grid') {
          // Move to end of current row
          const currentRow = Math.floor(focusIndex / columns);
          const rowEnd = Math.min(itemCount - 1, (currentRow + 1) * columns - 1);
          updateFocusIndex(rowEnd);
        } else {
          updateFocusIndex(itemCount - 1);
        }
        break;

      case 'PageUp':
        event.preventDefault();
        if (orientation === 'grid') {
          moveFocus(-columns * 3); // Move up 3 rows
        } else {
          moveFocus(-10); // Move up 10 items
        }
        break;

      case 'PageDown':
        event.preventDefault();
        if (orientation === 'grid') {
          moveFocus(columns * 3); // Move down 3 rows
        } else {
          moveFocus(10); // Move down 10 items
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        activate();
        break;

      case 'Escape':
        event.preventDefault();
        setIsActive(false);
        break;

      // Quick navigation with letters (for lists)
      default:
        if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
          // TODO: Implement type-ahead search
          // This would search for items starting with the typed letter
        }
        break;
    }
  }, [
    enabled,
    focusIndex,
    orientation,
    columns,
    itemCount,
    moveFocus,
    updateFocusIndex,
    activate,
    customKeyHandlers
  ]);

  // Reset focus index when item count changes
  useEffect(() => {
    if (focusIndex >= itemCount && itemCount > 0) {
      updateFocusIndex(itemCount - 1);
    } else if (itemCount === 0) {
      setFocusIndex(-1);
    }
  }, [itemCount, focusIndex, updateFocusIndex]);

  // Reset to initial index when options change
  useEffect(() => {
    setFocusIndex(initialIndex);
  }, [initialIndex]);

  return {
    focusIndex,
    isActive,
    setFocusIndex: updateFocusIndex,
    moveFocus,
    activate,
    reset,
    handleKeyDown
  };
}

/**
 * Hook for managing focus within a specific container
 */
export function useFocusManagement(options: {
  containerRef: React.RefObject<HTMLElement>;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}) {
  const { containerRef, autoFocus = false, restoreFocus = false, trapFocus = false } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previous focus when component mounts
  useEffect(() => {
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Auto focus first focusable element
    if (autoFocus && containerRef.current) {
      const firstFocusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }

    return () => {
      // Restore previous focus when component unmounts
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [autoFocus, restoreFocus, containerRef]);

  // Trap focus within container
  useEffect(() => {
    if (!trapFocus || !containerRef.current) return;

    const container = containerRef.current;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [trapFocus, containerRef]);

  return {
    focusPrevious: () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    },
    focusFirst: () => {
      if (containerRef.current) {
        const firstFocusable = containerRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    }
  };
}

export default useKeyboardNavigation;