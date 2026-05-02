/**
 * Keyboard Shortcut Hook for Song Library
 * 
 * Provides keyboard shortcut functionality with proper cleanup and cross-platform support.
 * Supports common patterns like Cmd+K, Ctrl+K, Escape, etc.
 */

import { useEffect, useCallback, useRef } from 'react';

type KeyboardShortcut = string | string[];
type ShortcutHandler = (event: KeyboardEvent) => void;

interface UseKeyboardShortcutOptions {
  /** Whether the shortcut is enabled */
  enabled?: boolean;
  /** Whether to prevent default behavior */
  preventDefault?: boolean;
  /** Whether to stop event propagation */
  stopPropagation?: boolean;
  /** Target element (defaults to document) */
  target?: HTMLElement | Document | Window;
}

/**
 * Parse keyboard shortcut string into modifier keys and main key
 */
function parseShortcut(shortcut: string) {
  const parts = shortcut.toLowerCase().split('+');
  const modifiers = {
    ctrl: false,
    cmd: false,
    alt: false,
    shift: false,
    meta: false,
  };
  
  let key = '';
  
  parts.forEach(part => {
    switch (part) {
      case 'ctrl':
        modifiers.ctrl = true;
        break;
      case 'cmd':
      case 'meta':
        modifiers.cmd = true;
        modifiers.meta = true;
        break;
      case 'alt':
        modifiers.alt = true;
        break;
      case 'shift':
        modifiers.shift = true;
        break;
      default:
        key = part;
    }
  });
  
  return { modifiers, key };
}

/**
 * Check if the pressed keys match the shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const { modifiers, key } = parseShortcut(shortcut);
  
  // Check modifiers
  if (modifiers.ctrl && !event.ctrlKey) return false;
  if (modifiers.cmd && !event.metaKey) return false;
  if (modifiers.alt && !event.altKey) return false;
  if (modifiers.shift && !event.shiftKey) return false;
  
  // Check main key
  const eventKey = event.key.toLowerCase();
  
  // Handle special keys
  const keyMap: Record<string, string> = {
    escape: 'escape',
    esc: 'escape',
    enter: 'enter',
    space: ' ',
    tab: 'tab',
    backspace: 'backspace',
    delete: 'delete',
    arrowup: 'arrowup',
    arrowdown: 'arrowdown',
    arrowleft: 'arrowleft',
    arrowright: 'arrowright',
    '↑': 'arrowup',
    '↓': 'arrowdown',
    '←': 'arrowleft',
    '→': 'arrowright',
    '↵': 'enter',
  };
  
  const normalizedKey = keyMap[key] || key;
  const normalizedEventKey = keyMap[eventKey] || eventKey;
  
  return normalizedKey === normalizedEventKey;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function useKeyboardShortcut(
  shortcuts: KeyboardShortcut,
  handler: ShortcutHandler,
  options: UseKeyboardShortcutOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    target = document,
  } = options;
  
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    const shortcutArray = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
    
    for (const shortcut of shortcutArray) {
      if (matchesShortcut(event, shortcut)) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        
        handlerRef.current(event);
        break;
      }
    }
  }, [shortcuts, enabled, preventDefault, stopPropagation]);
  
  useEffect(() => {
    const targetElement = target as EventTarget;
    
    if (targetElement && enabled) {
      targetElement.addEventListener('keydown', handleKeyDown);
      
      return () => {
        targetElement.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, target, enabled]);
}

/**
 * Hook for handling global keyboard shortcuts
 */
export function useGlobalKeyboardShortcut(
  shortcuts: KeyboardShortcut,
  handler: ShortcutHandler,
  options?: Omit<UseKeyboardShortcutOptions, 'target'>
) {
  return useKeyboardShortcut(shortcuts, handler, {
    ...options,
    target: document,
  });
}

/**
 * Hook for handling keyboard shortcuts on a specific element
 */
export function useElementKeyboardShortcut(
  elementRef: React.RefObject<HTMLElement>,
  shortcuts: KeyboardShortcut,
  handler: ShortcutHandler,
  options?: Omit<UseKeyboardShortcutOptions, 'target'>
) {
  return useKeyboardShortcut(shortcuts, handler, {
    ...options,
    target: elementRef.current || undefined,
  });
}

/**
 * Utility function to format shortcut for display
 */
export function formatShortcut(shortcut: string): string {
  const { modifiers, key } = parseShortcut(shortcut);
  const parts: string[] = [];
  
  // Detect platform for proper modifier display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (modifiers.cmd) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  } else if (modifiers.ctrl) {
    parts.push('Ctrl');
  }
  
  if (modifiers.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  
  if (modifiers.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  
  // Format key
  const keyMap: Record<string, string> = {
    escape: 'Esc',
    enter: '↵',
    space: 'Space',
    tab: 'Tab',
    backspace: '⌫',
    delete: 'Del',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
  };
  
  const formattedKey = keyMap[key] || key.toUpperCase();
  parts.push(formattedKey);
  
  return parts.join(isMac ? '' : '+');
}

/**
 * Common keyboard shortcuts
 */
export const SHORTCUTS = {
  COMMAND_PALETTE: ['cmd+k', 'ctrl+k'],
  ESCAPE: 'escape',
  ENTER: 'enter',
  ARROW_UP: 'arrowup',
  ARROW_DOWN: 'arrowdown',
  ARROW_LEFT: 'arrowleft',
  ARROW_RIGHT: 'arrowright',
  TAB: 'tab',
  SHIFT_TAB: 'shift+tab',
  SPACE: 'space',
  BACKSPACE: 'backspace',
  DELETE: 'delete',
  
  // Common combinations
  SELECT_ALL: ['cmd+a', 'ctrl+a'],
  COPY: ['cmd+c', 'ctrl+c'],
  PASTE: ['cmd+v', 'ctrl+v'],
  CUT: ['cmd+x', 'ctrl+x'],
  UNDO: ['cmd+z', 'ctrl+z'],
  REDO: ['cmd+shift+z', 'ctrl+y'],
  SAVE: ['cmd+s', 'ctrl+s'],
  FIND: ['cmd+f', 'ctrl+f'],
  NEW: ['cmd+n', 'ctrl+n'],
  
  // Song library specific
  PLAY_PAUSE: 'space',
  NEXT_SONG: 'arrowright',
  PREV_SONG: 'arrowleft',
  VOLUME_UP: 'arrowup',
  VOLUME_DOWN: 'arrowdown',
  TOGGLE_FAVORITE: ['cmd+d', 'ctrl+d'],
  ADD_TO_SETLIST: ['cmd+shift+a', 'ctrl+shift+a'],
} as const;

export default useKeyboardShortcut;