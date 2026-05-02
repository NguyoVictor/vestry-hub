/**
 * Command Palette Components Export
 * 
 * Exports all command palette related components and hooks
 */

export { CommandPalette, useCommandPalette } from './CommandPalette';
export type { default as CommandPaletteProps } from './CommandPalette';

// Re-export related hooks
export { useSongSearch, highlightMatches, getSearchSuggestions } from '../../hooks/useSongSearch';
export { useKeyboardShortcut, useGlobalKeyboardShortcut, useElementKeyboardShortcut, formatShortcut, SHORTCUTS } from '../../hooks/useKeyboardShortcut';