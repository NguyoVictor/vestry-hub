/**
 * useCommandPalette Hook for Song Library UI Revamp
 * 
 * Manages command palette state and keyboard shortcuts:
 * - ⌘K/Ctrl+K activation
 * - State management for open/close
 * - Keyboard event handling
 * - Focus management
 * 
 * This is a placeholder implementation - will be enhanced in subsequent tasks.
 */

import { useState, useCallback, useEffect } from 'react';

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ⌘K or Ctrl+K to toggle command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        toggle();
      }
      
      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggle, close]);

  // Prevent body scroll when command palette is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export default useCommandPalette;