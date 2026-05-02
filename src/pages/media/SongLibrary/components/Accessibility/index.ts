/**
 * Accessibility Components Index
 * 
 * Exports all accessibility-related components and utilities for the Song Library UI Revamp.
 */

// Main accessibility provider
export { 
  AccessibilityProvider, 
  useAccessibility, 
  useKeyboardOnly, 
  useAccessibleAnnouncements, 
  useAccessibleFocus 
} from './AccessibilityProvider';

// Accessible component wrappers
export { AccessibleSongCard } from './AccessibleSongCard';
export { AccessibleCommandPalette } from './AccessibleCommandPalette';
export { AccessibleSongGrid } from './AccessibleSongGrid';

// Keyboard shortcuts help
export { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

// Re-export accessibility utilities
export * from '../../utils/accessibility';
export * from '../../hooks/useKeyboardNavigation';