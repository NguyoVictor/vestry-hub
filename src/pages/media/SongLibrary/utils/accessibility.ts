/**
 * Accessibility Utilities for Song Library UI Revamp
 * 
 * Provides comprehensive accessibility support including:
 * - ARIA attribute management
 * - Screen reader announcements
 * - High contrast mode detection
 * - Focus management utilities
 * - Keyboard navigation helpers
 * 
 * Requirements: 12.2, 12.6, 12.7
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ARIA attribute types
export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-required'?: boolean;
  'aria-readonly'?: boolean;
  'aria-multiselectable'?: boolean;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  'aria-level'?: number;
  'aria-setsize'?: number;
  'aria-posinset'?: number;
  'aria-rowcount'?: number;
  'aria-colcount'?: number;
  'aria-rowindex'?: number;
  'aria-colindex'?: number;
  role?: string;
  tabIndex?: number;
}

// Screen reader announcement types
export type AnnouncementPriority = 'polite' | 'assertive';

export interface AnnouncementOptions {
  priority?: AnnouncementPriority;
  delay?: number;
  clearPrevious?: boolean;
}

/**
 * Generate ARIA attributes for song cards
 */
export function getSongCardAriaAttributes(
  song: { id: string; title: string; artist?: string; key?: string; bpm?: number },
  isSelected: boolean,
  position?: { row: number; col: number; total: number }
): AriaAttributes {
  const label = [
    song.title,
    song.artist && `by ${song.artist}`,
    song.key && `in key of ${song.key}`,
    song.bpm && `${song.bpm} BPM`
  ].filter(Boolean).join(', ');

  const attributes: AriaAttributes = {
    'aria-label': label,
    'aria-selected': isSelected,
    role: 'gridcell',
    tabIndex: isSelected ? 0 : -1
  };

  if (position) {
    attributes['aria-setsize'] = position.total;
    attributes['aria-posinset'] = position.row * position.col + position.col + 1;
  }

  return attributes;
}

/**
 * Generate ARIA attributes for setlist items
 */
export function getSetlistItemAriaAttributes(
  item: { id: string; songTitle: string; position: number },
  totalItems: number,
  isDragging?: boolean
): AriaAttributes {
  return {
    'aria-label': `${item.songTitle}, position ${item.position + 1} of ${totalItems}`,
    'aria-grabbed': isDragging,
    'aria-setsize': totalItems,
    'aria-posinset': item.position + 1,
    role: 'listitem',
    tabIndex: 0
  };
}

/**
 * Generate ARIA attributes for command palette
 */
export function getCommandPaletteAriaAttributes(
  isOpen: boolean,
  selectedIndex: number,
  totalResults: number
): AriaAttributes {
  return {
    role: 'combobox',
    'aria-expanded': isOpen,
    'aria-haspopup': 'listbox',
    'aria-activedescendant': selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined,
    'aria-label': `Search songs, ${totalResults} results available`
  };
}

/**
 * Generate ARIA attributes for search results
 */
export function getSearchResultAriaAttributes(
  index: number,
  isSelected: boolean,
  song: { title: string; artist?: string }
): AriaAttributes {
  return {
    id: `search-result-${index}`,
    role: 'option',
    'aria-selected': isSelected,
    'aria-label': `${song.title}${song.artist ? ` by ${song.artist}` : ''}`,
    tabIndex: -1
  };
}

/**
 * Generate ARIA attributes for filter controls
 */
export function getFilterAriaAttributes(
  filterType: string,
  isActive: boolean,
  activeCount?: number
): AriaAttributes {
  const label = activeCount 
    ? `${filterType} filter, ${activeCount} active filters`
    : `${filterType} filter`;

  return {
    'aria-label': label,
    'aria-pressed': isActive,
    role: 'button',
    tabIndex: 0
  };
}

/**
 * Hook for managing screen reader announcements
 */
export function useScreenReaderAnnouncements() {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  // Create announcement container on mount
  useEffect(() => {
    if (!announcementRef.current) {
      const container = document.createElement('div');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      container.className = 'sr-only';
      container.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(container);
      announcementRef.current = container;
    }

    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
        announcementRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((
    message: string,
    options: AnnouncementOptions = {}
  ) => {
    const { priority = 'polite', delay = 0, clearPrevious = true } = options;

    if (!announcementRef.current) return;

    const container = announcementRef.current;

    // Clear previous announcement if requested
    if (clearPrevious) {
      container.textContent = '';
    }

    // Update aria-live attribute based on priority
    container.setAttribute('aria-live', priority);

    // Announce after delay
    setTimeout(() => {
      if (container) {
        container.textContent = message;
      }
    }, delay);
  }, []);

  return { announce };
}

/**
 * Hook for detecting high contrast mode
 */
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const isWindowsHighContrast = window.matchMedia('(prefers-contrast: high)').matches ||
        window.matchMedia('(-ms-high-contrast: active)').matches ||
        window.matchMedia('(-ms-high-contrast: black-on-white)').matches ||
        window.matchMedia('(-ms-high-contrast: white-on-black)').matches;

      // Check for forced colors (Windows high contrast)
      const isForcedColors = window.matchMedia('(forced-colors: active)').matches;

      setIsHighContrast(isWindowsHighContrast || isForcedColors);
    };

    // Initial check
    checkHighContrast();

    // Listen for changes
    const mediaQueries = [
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(-ms-high-contrast: active)'),
      window.matchMedia('(forced-colors: active)')
    ];

    mediaQueries.forEach(mq => {
      mq.addEventListener('change', checkHighContrast);
    });

    return () => {
      mediaQueries.forEach(mq => {
        mq.removeEventListener('change', checkHighContrast);
      });
    };
  }, []);

  return isHighContrast;
}

/**
 * Hook for managing reduced motion preferences
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    // Initial check
    handleChange();

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Generate keyboard shortcut description for screen readers
 */
export function getKeyboardShortcutDescription(shortcut: string): string {
  const parts = shortcut.split('+').map(part => {
    switch (part.toLowerCase()) {
      case 'cmd':
      case 'meta':
        return 'Command';
      case 'ctrl':
        return 'Control';
      case 'alt':
        return 'Alt';
      case 'shift':
        return 'Shift';
      case ' ':
        return 'Space';
      case 'enter':
        return 'Enter';
      case 'escape':
      case 'esc':
        return 'Escape';
      case 'arrowup':
        return 'Up arrow';
      case 'arrowdown':
        return 'Down arrow';
      case 'arrowleft':
        return 'Left arrow';
      case 'arrowright':
        return 'Right arrow';
      default:
        return part.toUpperCase();
    }
  });

  return parts.join(' + ');
}

/**
 * Create accessible loading announcement
 */
export function getLoadingAnnouncement(
  isLoading: boolean,
  itemType: string,
  count?: number
): string {
  if (isLoading) {
    return `Loading ${itemType}...`;
  }
  
  if (count !== undefined) {
    return count === 0 
      ? `No ${itemType} found`
      : `${count} ${itemType}${count === 1 ? '' : 's'} loaded`;
  }
  
  return `${itemType} loaded`;
}

/**
 * Create accessible search result announcement
 */
export function getSearchResultAnnouncement(
  query: string,
  resultCount: number,
  isFiltered: boolean = false
): string {
  const filterText = isFiltered ? ' filtered' : '';
  
  if (resultCount === 0) {
    return `No${filterText} results found for "${query}"`;
  }
  
  return `${resultCount}${filterText} result${resultCount === 1 ? '' : 's'} found for "${query}"`;
}

/**
 * Create accessible drag and drop announcement
 */
export function getDragDropAnnouncement(
  action: 'start' | 'move' | 'drop' | 'cancel',
  itemName: string,
  position?: { from?: number; to?: number; total?: number }
): string {
  switch (action) {
    case 'start':
      return `Started dragging ${itemName}`;
    case 'move':
      if (position?.to !== undefined && position?.total !== undefined) {
        return `Moving ${itemName} to position ${position.to + 1} of ${position.total}`;
      }
      return `Moving ${itemName}`;
    case 'drop':
      if (position?.from !== undefined && position?.to !== undefined) {
        return `Moved ${itemName} from position ${position.from + 1} to position ${position.to + 1}`;
      }
      return `Dropped ${itemName}`;
    case 'cancel':
      return `Cancelled dragging ${itemName}`;
    default:
      return '';
  }
}

/**
 * Utility to check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];

  return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Create accessible status message for dynamic content
 */
export function getStatusMessage(
  type: 'success' | 'error' | 'warning' | 'info',
  message: string
): string {
  const prefix = {
    success: 'Success:',
    error: 'Error:',
    warning: 'Warning:',
    info: 'Information:'
  }[type];

  return `${prefix} ${message}`;
}

export default {
  getSongCardAriaAttributes,
  getSetlistItemAriaAttributes,
  getCommandPaletteAriaAttributes,
  getSearchResultAriaAttributes,
  getFilterAriaAttributes,
  useScreenReaderAnnouncements,
  useHighContrastMode,
  useReducedMotion,
  getKeyboardShortcutDescription,
  getLoadingAnnouncement,
  getSearchResultAnnouncement,
  getDragDropAnnouncement,
  isFocusable,
  getFocusableElements,
  getStatusMessage
};